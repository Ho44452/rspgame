export type CardId = "rock" | "paper" | "scissors";
export type Result = "win" | "lose" | "draw";

export type ActiveRoom = {
  code: string;
  role: "host" | "guest";
};

export type PlayerPresence = {
  playerId: string;
  name: string;
  role: ActiveRoom["role"];
};
