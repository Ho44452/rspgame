"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { ActiveRoom, CardId, PlayerPresence, Result } from "../game-types";
import { trackPresence } from "../../lib/game-realtime";
import { createClient as createSupabaseClient } from "../../lib/supabase/client";

type GameArenaProps = {
  room: ActiveRoom;
  playerName: string;
  onLeave: () => void;
};

async function broadcastWithRetry(
  channel: RealtimeChannel,
  event: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (await channel.send({ type: "broadcast", event, payload }) === "ok") return true;
    } catch {
      // Retry transient Realtime disconnects.
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
  }

  return false;
}

export default function GameArena({ room, playerName, onLeave }: GameArenaProps) {
  const [myHp, setMyHp] = useState(3);
  const [enemyHp, setEnemyHp] = useState(3);
  const [myChoice, setMyChoice] = useState<CardId | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [round, setRound] = useState(0);
  const [opponentMoves, setOpponentMoves] = useState<Record<string, CardId>>({});
  const [opponent, setOpponent] = useState<PlayerPresence | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "waiting" | "ready" | "error">("connecting");
  const [connectionError, setConnectionError] = useState("");
  const [roomFull, setRoomFull] = useState(false);
  const [playerId] = useState(() => `player-${Math.random().toString(36).slice(2)}`);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const matchEpochRef = useRef(0);
  const presenceReleasedEpochRef = useRef<number | null>(null);
  const [matchEpoch, setMatchEpoch] = useState(0);
  const resolvedRoundRef = useRef<number | null>(null);
  const roundRef = useRef(round);
  const roundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const opponentGraceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const moveKey = `${matchEpoch}:${round}`;
  const enemyChoice = opponentMoves[moveKey] ?? null;
  const enemyReady = enemyChoice !== null && enemyChoice !== undefined;
  const revealChoices = myChoice !== null && enemyChoice !== null;
  const didWinMatch = enemyHp === 0;
  const matchWinner = didWinMatch
    ? playerName
    : myHp === 0 ? opponent?.name ?? "คู่แข่ง" : null;

  const cards = [
    { id: "rock", name: "✊ ค้อน", color: "bg-red-500" },
    { id: "paper", name: "🖐️ กระดาษ", color: "bg-blue-500" },
    { id: "scissors", name: "✌️ กรรไกร", color: "bg-green-500" },
  ] as const;
  const cardDetails: Record<CardId, { title: string; tagline: string; description: string; accent: string }> = {
    rock: { title: "ค้อน (Rock)", tagline: "บดขยี้กรรไกร", description: "ชนะกรรไกร · แพ้กระดาษ", accent: "text-[#d0bcff]" },
    paper: { title: "กระดาษ (Paper)", tagline: "คลุมค้อน", description: "ชนะค้อน · แพ้กรรไกร", accent: "text-[#4cd7f6]" },
    scissors: { title: "กรรไกร (Scissors)", tagline: "ตัดกระดาษ", description: "ชนะกระดาษ · แพ้ค้อน", accent: "text-[#ddb7ff]" },
  };

  const resetMatch = useCallback((nextEpoch: number) => {
    if (nextEpoch <= matchEpochRef.current) return;
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    matchEpochRef.current = nextEpoch;
    resolvedRoundRef.current = null;
    roundRef.current = 0;
    setMatchEpoch(nextEpoch);
    setMyHp(3);
    setEnemyHp(3);
    setMyChoice(null);
    setOpponentMoves((moves) => Object.fromEntries(
      Object.entries(moves).filter(([key]) => key.startsWith(`${nextEpoch}:`)),
    ));
    setResult(null);
    setRound(0);
    setConnectionError("");
  }, []);

  useEffect(() => {
    let supabase: ReturnType<typeof createSupabaseClient>;

    try {
      supabase = createSupabaseClient();
    } catch (error) {
      const message = error instanceof Error ? error.message : "ตรวจสอบการตั้งค่า Supabase";
      queueMicrotask(() => {
        setConnectionStatus("error");
        setConnectionError(message);
      });
      return;
    }

    const channel = supabase.channel(`rps-room-${room.code}`, {
      config: {
        presence: { key: playerId },
        broadcast: { ack: true },
      },
    });
    channelRef.current = channel;

    const syncPlayers = () => {
      const players = Object.values(channel.presenceState<PlayerPresence>()).flat();
      const otherPlayers = players.filter((player) => player.playerId !== playerId);
      setRoomFull(otherPlayers.length > 1);

      if (otherPlayers.length > 0) {
        if (opponentGraceTimerRef.current) {
          clearTimeout(opponentGraceTimerRef.current);
          opponentGraceTimerRef.current = null;
        }
        setOpponent(otherPlayers[0]);
        setConnectionStatus("ready");
      } else if (!opponentGraceTimerRef.current) {
        opponentGraceTimerRef.current = setTimeout(() => {
          setOpponent(null);
          setConnectionStatus("waiting");
          opponentGraceTimerRef.current = null;
        }, 1500);
      }
    };

    channel
      .on("presence", { event: "sync" }, syncPlayers)
      .on("broadcast", { event: "move" }, (message) => {
        const move = message.payload as { playerId?: string; epoch?: number; round?: number; choice?: CardId };
        if (
          move.playerId !== playerId &&
          typeof move.epoch === "number" &&
          move.epoch >= matchEpochRef.current &&
          typeof move.round === "number" &&
          ["rock", "paper", "scissors"].includes(move.choice ?? "") &&
          (move.epoch > matchEpochRef.current || move.round >= roundRef.current)
        ) {
          const key = `${move.epoch}:${move.round}`;
          setOpponentMoves((moves) => ({ ...moves, [key]: move.choice as CardId }));
        }
      })
      .on("broadcast", { event: "rematch" }, (message) => {
        const payload = message.payload as { playerId?: string; epoch?: number };
        if (
          payload.playerId !== playerId &&
          typeof payload.epoch === "number" &&
          payload.epoch > matchEpochRef.current
        ) {
          resetMatch(payload.epoch);
          void trackPresence(channel, { playerId, name: playerName, role: room.role }).then((tracked) => {
            if (!tracked) setConnectionError("กลับเข้าห้องไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ");
          });
        }
      })
      .subscribe(async (status, error) => {
        if (status === "SUBSCRIBED") {
          const tracked = await trackPresence(channel, { playerId, name: playerName, role: room.role });

          if (tracked) {
            setConnectionError("");
            syncPlayers();
          } else {
            setConnectionStatus("error");
            setConnectionError("ส่งสถานะผู้เล่นไปยัง Supabase ไม่สำเร็จ");
          }
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setConnectionStatus("error");
          setConnectionError(error?.message ?? "เชื่อมต่อ Supabase Realtime ไม่สำเร็จ");
        }
      });

    return () => {
      channelRef.current = null;
      if (opponentGraceTimerRef.current) clearTimeout(opponentGraceTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [playerId, playerName, resetMatch, room.code, room.role]);

  useEffect(() => {
    if (matchWinner || !myChoice || !enemyChoice || resolvedRoundRef.current === round) return;

    resolvedRoundRef.current = round;
    const winningCard: Record<CardId, CardId> = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };
    const roundResult: Result = myChoice === enemyChoice
      ? "draw"
      : winningCard[myChoice] === enemyChoice ? "win" : "lose";

    setResult(roundResult);
    const nextMyHp = roundResult === "lose" ? Math.max(0, myHp - 1) : myHp;
    const nextEnemyHp = roundResult === "win" ? Math.max(0, enemyHp - 1) : enemyHp;
    setMyHp(nextMyHp);
    setEnemyHp(nextEnemyHp);

    if (nextMyHp === 0 || nextEnemyHp === 0) {
      if (presenceReleasedEpochRef.current !== matchEpoch) {
        presenceReleasedEpochRef.current = matchEpoch;
        const currentMoveKey = `${matchEpoch}:${round}`;
        setOpponentMoves((moves) => moves[currentMoveKey]
          ? { [currentMoveKey]: moves[currentMoveKey] }
          : {});
        // Presence is transient and not stored in the database. Keep the channel open for rematch signaling.
        void channelRef.current?.untrack();
      }
      return;
    }

    roundTimerRef.current = setTimeout(() => {
      const nextRound = round + 1;
      setMyChoice(null);
      setResult(null);
      roundRef.current = nextRound;
      setRound(nextRound);
      setOpponentMoves((moves) => Object.fromEntries(
        Object.entries(moves).filter(([key]) => {
          const [epoch, moveRound] = key.split(":").map(Number);
          return epoch === matchEpoch && moveRound >= nextRound;
        }),
      ));
    }, 3000);
  }, [enemyChoice, enemyHp, matchEpoch, matchWinner, myChoice, myHp, opponent?.name, playerName, round]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !myChoice || enemyChoice || matchWinner) return;

    const resendMove = () => {
      void broadcastWithRetry(channel, "move", {
        playerId,
        epoch: matchEpoch,
        round,
        choice: myChoice,
      });
    };

    const interval = setInterval(resendMove, 1200);
    return () => clearInterval(interval);
  }, [enemyChoice, matchEpoch, matchWinner, myChoice, playerId, round]);

  useEffect(() => () => {
    if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
    if (opponentGraceTimerRef.current) clearTimeout(opponentGraceTimerRef.current);
  }, []);

  const handleSelectCard = async (cardId: CardId) => {
    const channel = channelRef.current;
    if (!channel || !opponent || roomFull || matchWinner || myChoice || connectionStatus !== "ready") return;

    setMyChoice(cardId);
    const sent = await broadcastWithRetry(channel, "move", {
      playerId,
      epoch: matchEpoch,
      round,
      choice: cardId,
    });

    if (sent) {
      setConnectionError("");
    } else {
      setMyChoice((current) => current === cardId ? null : current);
      setConnectionError("ส่งตัวเลือกไปยัง Supabase ไม่สำเร็จ ลองเลือกอีกครั้ง");
    }
  };

  const handlePlayAgain = async () => {
    const channel = channelRef.current;
    if (!channel) return;

    const nextEpoch = matchEpochRef.current + 1;
    const sent = await broadcastWithRetry(channel, "rematch", { playerId, epoch: nextEpoch });

    if (sent) {
      resetMatch(nextEpoch);
      const tracked = await trackPresence(channel, { playerId, name: playerName, role: room.role });
      if (!tracked) setConnectionError("กลับเข้าห้องไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ");
    } else {
      setConnectionError("เริ่มเกมใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง");
    }
  };

  const connectionLabel = connectionStatus === "ready"
    ? "เชื่อมต่อผู้เล่นแล้ว"
    : connectionStatus === "connecting"
      ? "กำลังเชื่อมต่อ..."
      : connectionStatus === "error"
        ? "การเชื่อมต่อล้มเหลว"
        : room.role === "host" ? "รอเพื่อนเข้าห้อง..." : "กำลังค้นหาห้อง...";

  return (
    <div className="min-h-screen bg-[#12131d] text-[#e2e1f0] selection:bg-violet-400 selection:text-[#23005c]">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0c0d17]/90 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-7">
          <div className="flex min-w-0 items-center gap-3 rounded-xl bg-[#0c0d17] px-4 py-2">
            <span className="text-xl text-[#d0bcff]">♟</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold uppercase tracking-wider">SBU Arena · ห้อง #{room.code}</p>
              <p className="mt-0.5 truncate text-[10px] text-[#958ea0]">{playerName} · {room.role === "host" ? "HOST" : "CHALLENGER"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-[#0c0d17]/90 px-4 py-2 shadow-inner">
            <div className="text-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#ddb7ff]">Best of 3 · ชิง 2 ใน 3</p>
              <p className="mt-0.5 text-sm font-extrabold text-[#d0bcff]">รอบที่ {round + 1} <span className="text-[10px] font-normal text-[#958ea0]">/ 3 HP</span></p>
            </div>
            <span className="h-8 w-px bg-[#33343f]" />
            <div>
              <p className="text-[9px] uppercase tracking-wider text-[#958ea0]">Realtime</p>
              <p className={`text-xs font-bold ${connectionStatus === "error" ? "text-rose-300" : "text-[#4cd7f6]"}`}>{connectionLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onLeave} className="rounded-lg bg-[#282934] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#e2e1f0] transition hover:bg-rose-400/20 hover:text-rose-200">
            ← กลับล็อบบี้
          </button>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[1400px] flex-col gap-5 overflow-hidden px-4 py-6 sm:px-7 sm:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-[140px]" />
          <div className="absolute left-[-8rem] top-1/3 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[120px]" />
          <div className="absolute bottom-10 right-[-8rem] h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]" />
        </div>

        {connectionError && (
          <p role="alert" className="relative z-10 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-200">{connectionError}</p>
        )}

        <section className="relative z-10 flex flex-col items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-[#1a1b25]/85 p-4 shadow-xl backdrop-blur-xl md:flex-row md:px-6">
          <div className="flex w-full items-center gap-4 md:w-auto">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d0bcff] to-[#a078ff] text-xl text-[#340080] shadow-lg">♟</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-sm font-bold sm:text-base">{opponent?.name ?? "คู่แข่ง (Rival)"}</h2>
                <span className="rounded bg-cyan-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#4cd7f6]">{opponent ? "ONLINE" : "WAITING"}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-[#958ea0]">พลังชีวิตคู่แข่ง</span>
                <HpBar hp={enemyHp} tone="enemy" />
                <span className="text-[10px] font-bold text-rose-200">{enemyHp} / 3</span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 rounded-xl bg-[#0c0d17]/80 px-4 py-3 md:w-auto md:justify-end">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${enemyReady ? "animate-pulse bg-[#4cd7f6] shadow-[0_0_10px_#4cd7f6]" : "bg-[#958ea0]"}`} />
            <div className="text-right">
              <p className={`text-xs font-bold ${enemyReady ? "text-[#4cd7f6]" : "text-[#cbc3d7]"}`}>{enemyReady ? "คู่แข่งเลือกไพ่แล้ว" : opponent ? "รอคู่แข่งเลือก..." : connectionLabel}</p>
              <p className="mt-0.5 text-[10px] text-[#958ea0]">{enemyReady ? "เปิดไพ่พร้อมกันเมื่อทั้งสองคนเลือกแล้ว" : "สถานะการเลือกจะแสดงที่นี่"}</p>
            </div>
            <span aria-hidden="true" className="rounded-lg bg-[#282934] px-2.5 py-2 text-sm text-[#4cd7f6]">{enemyReady ? "✓" : "⌑"}</span>
          </div>
        </section>

        <section className="relative z-10 overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1e1f2a]/75 p-4 shadow-2xl backdrop-blur-2xl sm:p-6 lg:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-violet-400/[0.04] via-transparent to-cyan-300/[0.04]" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[#d0bcff]">⚡</span>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e2e1f0]">เปิดไพ่ · ผลการประลองรอบที่ {round + 1}</h2>
            </div>
            <span className="rounded-full bg-[#282934] px-3 py-1 text-[9px] font-mono uppercase text-[#4cd7f6]">Match #{room.code} · Round {round + 1}</span>
          </div>

          <div className="relative z-10 my-6 grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
            <MoveReveal label="YOU (คุณ)" choice={revealChoices ? myChoice : null} cards={cards} details={cardDetails} tone="player" />
            <div className="flex flex-row items-center justify-center gap-2 py-1 md:flex-col">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-400/30 to-cyan-300/20 text-sm font-black italic shadow-[0_0_30px_rgba(208,188,255,0.2)] ring-1 ring-white/10">VS</span>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#4cd7f6]">CLASH</span>
            </div>
            <MoveReveal label="RIVAL (คู่แข่ง)" choice={revealChoices ? enemyChoice : null} cards={cards} details={cardDetails} tone="enemy" />
          </div>

          <div aria-live="polite" className="relative z-10 flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300/10 via-violet-300/10 to-cyan-300/10 px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
            <p className={`text-sm font-extrabold ${result === "win" ? "text-[#4cd7f6]" : result === "lose" ? "text-rose-200" : result === "draw" ? "text-[#ddb7ff]" : "text-[#cbc3d7]"}`}>
              {result ? result === "win" ? "⚡ ชนะรอบนี้!" : result === "lose" ? "รอบนี้คู่แข่งชนะ" : "เสมอ!" : myChoice ? "เลือกแล้ว · รอคู่แข่งเลือกไพ่..." : "เลือกไพ่เพื่อเริ่มการประลอง"}
            </p>
            <p className="text-[10px] text-[#958ea0]">{result === "win" ? "คู่แข่งเสีย 1 HP" : result === "lose" ? "คุณเสีย 1 HP" : result === "draw" ? "ไม่มีใครเสีย HP" : "เปิดผลเมื่อทั้งสองฝ่ายเลือกแล้ว"}</p>
          </div>
        </section>

        <section className="relative z-10 flex flex-col gap-5 rounded-2xl border border-white/[0.06] bg-[#1a1b25]/90 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-extrabold">เลือกการ์ดของคุณ <span className="text-[10px] font-bold uppercase tracking-wider text-[#d0bcff]">(Choose your move)</span></h2>
              <p className="mt-1 text-xs text-[#958ea0]">เลือกไพ่ลับของคุณ · เปิดเผยพร้อมกันเมื่อคู่แข่งเลือกแล้ว</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#0c0d17] px-4 py-2.5">
              <span className="text-lg text-[#d0bcff]">⬡</span>
              <div><p className="text-[9px] uppercase tracking-wider text-[#958ea0]">พลังชีวิตของคุณ (HP)</p><p className="text-xs font-bold text-[#d0bcff]">{myHp} / 3</p></div>
              <HpBar hp={myHp} tone="player" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {cards.map((card) => {
              const details = cardDetails[card.id];
              const selected = myChoice === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleSelectCard(card.id)}
                  disabled={!opponent || roomFull || matchWinner !== null || myChoice !== null || connectionStatus !== "ready"}
                  aria-pressed={selected}
                  className={`group relative flex min-h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border p-5 text-center transition duration-300 hover:-translate-y-1 disabled:cursor-not-allowed disabled:opacity-55 ${selected ? "border-violet-300/60 bg-gradient-to-b from-violet-400/20 to-[#0c0d17] ring-2 ring-violet-300/40 shadow-[0_0_25px_rgba(160,120,255,0.18)]" : "border-white/[0.07] bg-gradient-to-b from-[#282934] to-[#0c0d17] hover:border-cyan-200/30 hover:shadow-xl"}`}
                >
                  {selected && <span className="absolute right-3 top-3 rounded bg-[#a078ff] px-2 py-1 text-[9px] font-bold uppercase text-[#340080]">✓ Selected</span>}
                  <span className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] text-5xl shadow-inner transition duration-300 group-hover:scale-105 ${selected ? "ring-1 ring-violet-300/40" : ""}`}>{card.name.split(" ")[0]}</span>
                  <span className="text-lg font-black">{details.title}</span>
                  <span className={`mt-1 text-xs font-bold ${details.accent}`}>{details.tagline}</span>
                  <span className="mt-2 text-[10px] text-[#958ea0]">{details.description}</span>
                  <span className="mt-5 w-full rounded-lg bg-[#0c0d17]/80 px-3 py-2 text-[9px] font-mono uppercase tracking-wide text-[#958ea0]">{selected ? "Selection locked" : "Choose move"}</span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
            <p className="flex items-center gap-2 text-[10px] text-[#958ea0]"><span className="text-[#4cd7f6]">ⓘ</span> ตัวเลือกจะถูกล็อกหลังส่ง และเปิดพร้อมกันเมื่อทั้งคู่เลือกแล้ว</p>
            {myChoice && !enemyReady && <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[10px] font-bold text-[#4cd7f6]">✓ ส่งตัวเลือกแล้ว · รอคู่แข่ง</span>}
          </div>
        </section>

        <section className="relative z-10 flex flex-col justify-between gap-3 rounded-xl bg-[#0c0d17]/90 px-4 py-4 text-[10px] text-[#958ea0] shadow-inner sm:flex-row sm:items-center sm:px-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2"><span className="text-[#4cd7f6]">⌘</span> Supabase Realtime: <span className="font-mono text-[#e2e1f0]">rps-room-{room.code}</span></span>
            <span className="hidden text-[#33343f] sm:inline">|</span>
            <span>Move sync: <span className="text-[#d0bcff]">{connectionStatus === "ready" ? "Active" : "Waiting"}</span></span>
          </div>
          <span className={`flex items-center gap-2 font-bold uppercase tracking-wider ${connectionStatus === "error" ? "text-rose-200" : "text-[#4cd7f6]"}`}><span className={`h-2 w-2 rounded-full ${connectionStatus === "error" ? "bg-rose-300" : "animate-pulse bg-[#4cd7f6]"}`} />{connectionLabel}</span>
        </section>
      </main>

      {matchWinner && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#080910]/85 p-5 backdrop-blur-md">
          <section role="dialog" aria-modal="true" aria-labelledby="match-result-title" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#1e1f2a] p-8 text-center shadow-2xl shadow-violet-950/40">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#4cd7f6] via-[#d0bcff] to-[#ddb7ff]" />
            <div className="text-5xl" aria-hidden="true">{didWinMatch ? "🏆" : "🎮"}</div>
            <h2 id="match-result-title" className="mt-4 text-3xl font-black">{didWinMatch ? "คุณชนะแล้ว!" : "คุณแพ้แล้ว!"}</h2>
            <p className="mt-2 text-sm text-[#cbc3d7]">ผู้ชนะคือ <span className="font-bold text-[#d0bcff]">{matchWinner}</span></p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handlePlayAgain} className="rounded-xl bg-gradient-to-r from-[#a078ff] to-[#ddb7ff] px-5 py-3 text-sm font-bold text-[#340080] transition hover:brightness-110">↻ เล่นอีกครั้ง</button>
              <button type="button" onClick={onLeave} className="rounded-xl bg-[#33343f] px-5 py-3 text-sm font-bold text-[#e2e1f0] transition hover:bg-[#494454]">กลับล็อบบี้</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function HpBar({ hp, tone }: { hp: number; tone: "player" | "enemy" }) {
  const activeColor = tone === "player" ? "bg-gradient-to-r from-[#d0bcff] to-[#a078ff] shadow-[0_0_10px_rgba(208,188,255,0.4)]" : "bg-gradient-to-r from-rose-300 to-rose-500 shadow-[0_0_10px_rgba(251,113,133,0.35)]";
  return (
    <div className="flex items-center gap-1.5" aria-label={`${hp} จาก 3 HP`}>
      {[0, 1, 2].map((segment) => <span key={segment} className={`h-2.5 w-6 rounded-sm sm:w-8 ${segment < hp ? activeColor : "bg-[#33343f] opacity-60"}`} />)}
    </div>
  );
}

function MoveReveal({
  label,
  choice,
  cards,
  details,
  tone,
}: {
  label: string;
  choice: CardId | null;
  cards: readonly { id: CardId; name: string; color: string }[];
  details: Record<CardId, { title: string; tagline: string; description: string; accent: string }>;
  tone: "player" | "enemy";
}) {
  const selectedCard = cards.find((card) => card.id === choice);
  const accent = tone === "player" ? "text-[#d0bcff]" : "text-rose-200";
  const badge = tone === "player" ? "bg-violet-300/10" : "bg-rose-300/10";
  return (
    <div className="relative min-h-36 overflow-hidden rounded-2xl border border-white/[0.05] bg-[#0c0d17]/90 p-4 shadow-xl sm:p-5">
      <span aria-hidden="true" className={`absolute -right-7 -top-8 h-24 w-24 rounded-full blur-2xl ${tone === "player" ? "bg-violet-400/15" : "bg-rose-400/10"}`} />
      <div className="relative flex items-center justify-between gap-2">
        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${accent}`}>{label}</span>
        <span className={`rounded px-2 py-1 text-[9px] font-bold uppercase ${badge} ${accent}`}>{selectedCard ? "Revealed" : "Waiting"}</span>
      </div>
      <div className="relative mt-4 flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-[#282934] text-3xl shadow-lg sm:h-16 sm:w-16 sm:text-4xl">{selectedCard ? selectedCard.name.split(" ")[0] : "?"}</span>
        <div className="min-w-0">
          {selectedCard ? <>
            <p className="truncate text-sm font-extrabold">{details[selectedCard.id].title}</p>
            <p className={`mt-1 text-[10px] ${accent}`}>{details[selectedCard.id].tagline}</p>
          </> : <>
            <p className="text-sm font-bold text-[#cbc3d7]">ยังไม่เปิดไพ่</p>
            <p className="mt-1 text-[10px] text-[#958ea0]">{tone === "player" ? "เลือกการ์ดด้านล่าง" : "รอคู่แข่งเลือก"}</p>
          </>}
        </div>
      </div>
    </div>
  );
}
