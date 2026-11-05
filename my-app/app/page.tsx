"use client";

import { useState, type FormEvent } from "react";
import GameArena from "./components/game-arena";
import GameLobby from "./components/game-lobby";
import type { ActiveRoom } from "./game-types";

export default function Home() {
  const [playerName, setPlayerName] = useState("Player 1");
  const [joinCode, setJoinCode] = useState("");
  const [activeRoom, setActiveRoom] = useState<ActiveRoom | null>(null);
  const [joinError, setJoinError] = useState("");

  const createRoom = () => {
    const code = Math.random().toString(36).slice(2, 8).padEnd(6, "0").toUpperCase();
    setActiveRoom({ code, role: "host" });
  };

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setJoinError("กรุณากรอกรหัสห้อง 6 ตัวอักษร");
      return;
    }

    setJoinError("");
    setActiveRoom({ code, role: "guest" });
  };

  if (activeRoom) {
    return (
      <GameArena
        room={activeRoom}
        playerName={playerName.trim() || "Player 1"}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return (
    <GameLobby
      playerName={playerName}
      joinCode={joinCode}
      joinError={joinError}
      onPlayerNameChange={setPlayerName}
      onJoinCodeChange={(value) => {
        setJoinCode(value.toUpperCase());
        setJoinError("");
      }}
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
    />
  );
}
