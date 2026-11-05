"use client";

import { useState, type FormEvent, type ReactNode } from "react";

type GameLobbyProps = {
  playerName: string;
  joinCode: string;
  joinError: string;
  onPlayerNameChange: (value: string) => void;
  onJoinCodeChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (event: FormEvent<HTMLFormElement>) => void;
};

const sigils = [
  { id: "rock", symbol: "✊", name: "ค้อน", note: "บดขยี้กรรไกร", tint: "violet" },
  { id: "paper", symbol: "✋", name: "กระดาษ", note: "คลุมค้อน", tint: "cyan" },
  { id: "scissors", symbol: "✌️", name: "กรรไกร", note: "ตัดกระดาษ", tint: "fuchsia" },
] as const;

const randomNames = ["Shadow_Striker", "Neon_Blade", "Master_Kame", "Vortex_SBU", "Cyber_Fist", "Titan_99"];

export default function GameLobby({
  playerName,
  joinCode,
  joinError,
  onPlayerNameChange,
  onJoinCodeChange,
  onCreateRoom,
  onJoinRoom,
}: GameLobbyProps) {
  const [selectedSigil, setSelectedSigil] = useState<(typeof sigils)[number]["id"]>("rock");
  const [clipboardMessage, setClipboardMessage] = useState("");
  const activeSigil = sigils.find((sigil) => sigil.id === selectedSigil) ?? sigils[0];

  const randomizeName = () => {
    const candidates = randomNames.filter((name) => name !== playerName);
    onPlayerNameChange(candidates[Math.floor(Math.random() * candidates.length)] ?? randomNames[0]);
  };

  const pasteRoomCode = async () => {
    try {
      const code = (await navigator.clipboard.readText()).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      if (!code) {
        setClipboardMessage("ไม่พบรหัสห้องในคลิปบอร์ด");
        return;
      }
      onJoinCodeChange(code);
      setClipboardMessage(code.length === 6 ? "กรอกรหัสห้องแล้ว" : `วางรหัสแล้ว (${code.length}/6)`);
    } catch {
      setClipboardMessage("เบราว์เซอร์ไม่อนุญาตให้อ่านคลิปบอร์ด");
    }
  };

  return (
    <div id="lobby" className="min-h-screen bg-[#12131d] text-[#e2e1f0] selection:bg-violet-400 selection:text-[#23005c]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#0c0d17]/90 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
          <a href="#lobby" className="flex shrink-0 items-center gap-3" aria-label="SBU Arena home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-indigo-600 text-xl shadow-lg shadow-violet-950/40">✊</span>
            <span className="flex flex-col">
              <span className="text-sm font-extrabold uppercase tracking-tight">SBU Arena</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-fuchsia-200">Rock · Paper · Scissors Battleground</span>
            </span>
          </a>

          <div className="hidden items-center gap-2 xl:flex">
            <span className="flex items-center gap-2 rounded-full bg-[#1a1b25] px-3 py-2 text-xs text-[#cbc3d7]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#4cd7f6]" />
              Supabase Realtime <span className="text-[#4cd7f6]">พร้อม</span>
            </span>
          </div>

          <nav className="hidden items-center gap-1 rounded-xl bg-[#0c0d17] p-1 lg:flex" aria-label="Main navigation">
            <a href="#lobby" aria-current="page" className="rounded-lg bg-[#a078ff] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#340080]">Lobby</a>
            <a href="#matchmaking" className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#cbc3d7] transition hover:bg-[#282934] hover:text-white">Matchmaking</a>
            <a href="#arena-info" className="rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#cbc3d7] transition hover:bg-[#282934] hover:text-white">How to play</a>
          </nav>

          <div className="flex items-center gap-2 rounded-xl bg-[#1a1b25] px-3 py-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d0bcff] text-sm text-[#3c0091]">♟</span>
            <span className="hidden max-w-32 truncate text-xs font-semibold sm:block">{playerName || "Player"}</span>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-[1500px] flex-col gap-7 overflow-hidden px-4 py-7 sm:px-7 sm:py-9 xl:px-10">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/4 h-[400px] w-[600px] rounded-full bg-violet-500/15 blur-[140px]" />
          <div className="absolute right-[-8rem] top-1/3 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[160px]" />
          <div className="absolute -bottom-28 left-1/3 h-[350px] w-[700px] rounded-full bg-fuchsia-500/10 blur-[180px]" />
        </div>

        <section className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-stretch">
          <div className="flex flex-col justify-between gap-7 py-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#282934]/80 px-4 py-2 shadow-lg backdrop-blur">
                <span className="h-2 w-2 animate-ping rounded-full bg-[#4cd7f6]" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4cd7f6]">Quick Match · Best of 3</span>
                <span className="text-[#958ea0]">/</span>
                <span className="text-xs text-[#cbc3d7]">ศึกตัดสินแบบเรียลไทม์</span>
              </div>
              <h1 className="max-w-4xl text-4xl font-black uppercase leading-[1.08] tracking-tight sm:text-5xl xl:text-6xl">
                ศึกตัดสิน <span className="bg-gradient-to-r from-[#d0bcff] via-[#ddb7ff] to-[#4cd7f6] bg-clip-text text-transparent">เริ่มที่ห้องของคุณ</span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#cbc3d7] sm:text-base">
                สร้างห้องส่วนตัวแล้วชวนเพื่อน หรือใส่รหัสเพื่อเข้าร่วมเกม ใครจะเป็นแชมป์เป่ายิ้งฉุบตัวจริงแห่ง SBU Tactical Arena?
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FeatureBadge icon="●" color="text-[#4cd7f6]">1 ต่อ 1 Realtime Duel</FeatureBadge>
              <FeatureBadge icon="◆" color="text-[#d0bcff]">แข่ง 3 พลังชีวิต (3 HP)</FeatureBadge>
              <FeatureBadge icon="✦" color="text-[#ddb7ff]">ห้องเข้ารหัสส่วนตัว</FeatureBadge>
            </div>
          </div>

          <section className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#1e1f2a]/90 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-6" aria-labelledby="identity-title">
            <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-[#a078ff] via-[#ddb7ff] to-[#4cd7f6]" />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#ddb7ff]">Player identity</p>
                <h2 id="identity-title" className="mt-1 text-lg font-bold">ข้อมูลผู้เล่น</h2>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-[#33343f] px-3 py-2 text-[10px] font-bold text-[#4cd7f6]">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute h-full w-full animate-ping rounded-full bg-[#4cd7f6] opacity-60" /><span className="relative h-2.5 w-2.5 rounded-full bg-[#4cd7f6]" /></span>
                READY
              </span>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label htmlFor="player-name" className="text-xs font-medium text-[#cbc3d7]">ชื่อผู้เล่น (Player Name)</label>
                <button type="button" onClick={randomizeName} className="text-[10px] font-bold text-[#d0bcff] hover:text-white">สุ่มชื่อ ↺</button>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-[#0c0d17] px-4 ring-1 ring-white/[0.04] focus-within:ring-2 focus-within:ring-violet-400/70">
                <span aria-hidden="true" className="text-lg text-[#d0bcff]">♟</span>
                <input id="player-name" value={playerName} onChange={(event) => onPlayerNameChange(event.target.value)} maxLength={16} placeholder="Player_SBU99" className="h-12 min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#6f6b7b]" />
              </div>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs text-[#cbc3d7]">สัญลักษณ์ประจำตัว (Battle Sigil)</p>
              <div className="grid grid-cols-3 gap-2">
                {sigils.map((sigil) => {
                  const selected = sigil.id === selectedSigil;
                  const selectedTone = {
                    violet: "border-violet-300/50 bg-violet-400/20 shadow-violet-950/20",
                    cyan: "border-cyan-300/50 bg-cyan-400/20 shadow-cyan-950/20",
                    fuchsia: "border-fuchsia-300/50 bg-fuchsia-400/20 shadow-fuchsia-950/20",
                  }[sigil.tint];
                  return (
                    <button key={sigil.id} type="button" onClick={() => setSelectedSigil(sigil.id)} aria-pressed={selected} className={`flex min-h-24 flex-col items-center justify-center rounded-xl border p-2 text-center transition duration-200 hover:-translate-y-0.5 ${selected ? `${selectedTone} text-white shadow-lg` : "border-white/[0.06] bg-[#282934] text-[#cbc3d7] hover:bg-[#33343f]"}`}>
                      <span className="text-2xl transition-transform group-hover:scale-110">{sigil.symbol}</span>
                      <span className="mt-1 text-[11px] font-bold">{sigil.name}</span>
                      <span className="mt-0.5 text-[9px] opacity-70">{sigil.note}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-violet-300/10 bg-[#0c0d17]/80 p-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4cd7f6]">Duel preview</span>
                <span className="flex items-center gap-1.5 text-[9px] text-[#958ea0]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#4cd7f6]" /> ARENA READY</span>
              </div>
              <div className="flex items-center justify-around py-3">
                <PreviewFighter label="คุณ (YOU)" symbol={activeSigil.symbol} color="violet" />
                <div className="text-center"><span className="rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 px-2.5 py-1 text-[10px] font-black text-[#23005c]">VS ⚡</span><p className="mt-2 text-[9px] font-bold tracking-widest text-[#ddb7ff]">CLASH</p></div>
                <PreviewFighter label="คู่แข่ง (RIVAL)" symbol="✌️" color="cyan" />
              </div>
              <p className="border-t border-white/[0.06] pt-2 text-center text-[10px] text-[#4cd7f6]">เลือกไพ่พร้อมกัน แล้วเปิดผลพร้อมกัน</p>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#0c0d17]/70 p-3 text-[10px] text-[#cbc3d7]">
              <span>⚡ โหมด: ห้องส่วนตัว</span><span>♛ SBU Arena</span>
            </div>
          </section>
        </section>

        <section id="matchmaking" className="relative z-10 grid gap-5 lg:grid-cols-2">
          <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-violet-300/10 bg-[#1e1f2a]/85 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:border-violet-300/30 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#a078ff] to-[#d0bcff]" />
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 text-7xl text-violet-300/[0.06]">✦</span>
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#a078ff] text-2xl text-[#340080] shadow-lg">✦</span>
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#d0bcff]">Host Arena</p><h2 className="text-xl font-extrabold">สร้างห้องใหม่</h2></div>
                </div>
                <span className="rounded-full bg-violet-300/10 px-3 py-1.5 text-[9px] font-bold text-[#d0bcff]">HOST NODE</span>
              </div>
              <p className="mt-5 max-w-xl text-sm leading-6 text-[#cbc3d7]">เปิดห้องส่วนตัว รับรหัสห้อง แล้วส่งให้เพื่อนเข้ามาดวลกันผ่าน Supabase Realtime</p>
              <div className="mt-5 space-y-3 rounded-xl bg-[#0c0d17]/80 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#ddb7ff]">การตั้งค่าห้อง (Match Configuration)</p>
                <ConfigRow label="รูปแบบการแข่งขัน" value="Best of 3 · 3 HP" />
                <ConfigRow label="โหมดการเล่น" value="Casual · ห้องส่วนตัว" />
                <ConfigRow label="สถานะห้อง" value="เปิดให้เพื่อนเข้าร่วม" />
              </div>
            </div>
            <div className="relative mt-6">
              <button type="button" onClick={onCreateRoom} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-[#a078ff] via-[#d0bcff] to-[#ddb7ff] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-[#340080] shadow-lg shadow-violet-950/30 transition hover:brightness-110 active:scale-[0.99]">
                สร้างห้องใหม่ทันที <span aria-hidden="true" className="text-xl">↗</span>
              </button>
              <p className="mt-3 flex items-center justify-center gap-2 text-[10px] text-[#cbc3d7]"><span className="h-1.5 w-1.5 rounded-full bg-[#4cd7f6]" />ระบบสุ่มรหัสห้อง 6 ตัวให้อัตโนมัติ</p>
            </div>
          </article>

          <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-cyan-200/10 bg-[#1e1f2a]/85 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition hover:border-cyan-200/30 sm:p-7">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#4cd7f6] to-[#ddb7ff]" />
            <span aria-hidden="true" className="pointer-events-none absolute right-4 top-4 text-7xl text-cyan-300/[0.06]">↗</span>
            <div className="relative">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#009eb9] text-2xl text-[#002f38] shadow-lg">🎮</span>
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4cd7f6]">Challenger</p><h2 className="text-xl font-extrabold">เข้าร่วมห้อง</h2></div>
                </div>
                <span className="rounded-full bg-cyan-300/10 px-3 py-1.5 text-[9px] font-bold text-[#4cd7f6]">JOIN HUB</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-[#cbc3d7]">มีรหัสห้องแล้วใช่ไหม? กรอกรหัส 6 ตัวอักษรเพื่อเข้าร่วมแมตช์ที่เพื่อนเปิดรอไว้</p>
              <div className="mt-5 rounded-xl bg-[#0c0d17]/80 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <label htmlFor="room-code" className="text-[10px] font-bold uppercase tracking-wider text-[#4cd7f6]">รหัสห้อง 6 ตัว (Room Code)</label>
                  <button type="button" onClick={pasteRoomCode} className="flex items-center gap-1 text-[10px] font-semibold text-[#ddb7ff] transition hover:text-white">▣ วางรหัส</button>
                </div>
                <form onSubmit={onJoinRoom} className="space-y-3">
                  <input id="room-code" value={joinCode} onChange={(event) => onJoinCodeChange(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} maxLength={6} autoComplete="off" placeholder="A B C 1 2 3" aria-label="รหัสห้อง 6 ตัวอักษร" className="h-14 w-full rounded-xl bg-[#282934] px-4 text-center font-mono text-2xl font-extrabold uppercase tracking-[0.45em] text-[#4cd7f6] shadow-inner outline-none placeholder:text-sm placeholder:tracking-[0.2em] placeholder:text-[#6f6b7b] focus:ring-2 focus:ring-cyan-300" />
                  <div className="flex min-h-5 items-center justify-between gap-3 text-[10px] text-[#958ea0]">
                    <p role={joinError ? "alert" : "status"} className={joinError ? "text-rose-300" : "text-[#4cd7f6]"}>{joinError || clipboardMessage || (joinCode.length === 6 ? "✓ รหัสครบแล้ว พร้อมเข้าร่วม" : `รอกรอกรหัสให้ครบ (${joinCode.length}/6)` )}</p>
                    <span className="shrink-0">A–Z, 0–9</span>
                  </div>
                  <button type="submit" disabled={joinCode.trim().length !== 6} className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#33343f] px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg transition hover:bg-[#009eb9] hover:text-[#002f38] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40">
                    เข้าร่วมเกม <span aria-hidden="true" className="text-xl">→</span>
                  </button>
                </form>
              </div>
            </div>
            <p className="relative mt-4 text-center text-[10px] text-[#958ea0]">ระบบจะเชื่อมต่อไปยังห้องของคู่ต่อสู้</p>
          </article>
        </section>

        <section id="arena-info" className="relative z-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex items-center gap-4 rounded-2xl bg-[#1a1b25] p-5 shadow-lg">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-300/10 text-2xl text-[#4cd7f6]">⌘</span>
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#4cd7f6]"><span className="h-2 w-2 rounded-full bg-[#4cd7f6]" />Supabase Realtime Engine</p>
              <p className="mt-1 text-xs leading-5 text-[#cbc3d7]">การเชื่อมต่อห้องและสถานะผู้เล่นทำงานผ่าน Supabase Realtime</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#1a1b25] p-5 shadow-lg">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"><span className="text-[#ddb7ff]">◉</span> วิธีเริ่มเล่น</p>
              <span className="text-[10px] text-[#958ea0]">1 — 2 — 3</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Step number="01" title="ใส่ชื่อ" detail="ตั้งชื่อและเลือกสัญลักษณ์" />
              <Step number="02" title="สร้างหรือเข้า" detail="แชร์รหัสห้องกับเพื่อน" />
              <Step number="03" title="ดวลกัน" detail="เลือกไพ่พร้อมกัน 3 HP" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] bg-[#0c0d17] px-4 py-6 sm:px-7 xl:px-10">
        <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[#958ea0]"><span className="text-lg">✊</span> © 2026 SBU Arena · Tactical RPS</div>
          <div className="flex items-center gap-2 text-[10px] text-[#958ea0]"><span>High-velocity arena duel</span><span className="h-1.5 w-1.5 rounded-full bg-[#4cd7f6]" /><span className="text-[#4cd7f6]">Realtime ready</span></div>
        </div>
      </footer>
    </div>
  );
}

function FeatureBadge({ children, icon, color }: { children: ReactNode; icon: string; color: string }) {
  return <span className="flex items-center gap-2 rounded-lg bg-[#1a1b25] px-3 py-2 text-[11px] font-semibold shadow-sm"><span className={color}>{icon}</span>{children}</span>;
}

function PreviewFighter({ label, symbol, color }: { label: string; symbol: string; color: "violet" | "cyan" }) {
  const borderColor = color === "violet" ? "border-[#a078ff] bg-violet-400/10" : "border-[#4cd7f6] bg-cyan-300/10";
  const textColor = color === "violet" ? "text-[#d0bcff]" : "text-[#4cd7f6]";
  return <div className="flex flex-col items-center"><span className={`flex h-11 w-11 items-center justify-center rounded-full border ${borderColor} text-2xl shadow-lg`}>{symbol}</span><span className={`mt-1 text-[9px] font-bold ${textColor}`}>{label}</span></div>;
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 text-xs"><span className="text-[#958ea0]">{label}</span><span className="text-right font-semibold text-[#e2e1f0]">{value}</span></div>;
}

function Step({ number, title, detail }: { number: string; title: string; detail: string }) {
  return <div className="rounded-xl bg-[#12131d] p-3"><span className="text-[9px] font-bold tracking-wider text-[#4cd7f6]">{number}</span><p className="mt-1 text-xs font-bold">{title}</p><p className="mt-1 text-[10px] leading-4 text-[#958ea0]">{detail}</p></div>;
}
