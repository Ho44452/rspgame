import type { RealtimeChannel } from "@supabase/supabase-js";
import type { PlayerPresence } from "../app/game-types";

export async function trackPresence(
  channel: RealtimeChannel,
  presence: PlayerPresence,
): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (channel.state !== "joined") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      continue;
    }

    try {
      if (await channel.track(presence) === "ok") return true;
    } catch {
      // Retry while Realtime reconnects its socket.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return false;
}
