import "server-only";

import type { ScoreRow } from "@/lib/games";
import { MAX_SCORE, PLAYER_NAME_RE } from "@/lib/scores-shared";
import { createClient } from "@/lib/supabase/server";

export { MAX_SCORE, PLAYER_NAME_RE };

export interface SubmitScoreInput {
  gameId: string;
  playerName: string;
  score: number;
}
export type SubmitScoreResult = { ok: true } | { ok: false; error: string };

// Con cacheComponents, createClient() lee cookies: estas funciones deben
// llamarse desde componentes async dentro de <Suspense>.

export async function getRegisteredGameIds(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("games").select("id");
  if (error) throw new Error(`No se pudieron leer los juegos: ${error.message}`);
  return data.map((g) => g.id);
}

// Ordenado por score desc y created_at asc (desempate por antigüedad).
export async function getLeaderboard(gameId: string, limit: number): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`No se pudo leer el leaderboard: ${error.message}`);

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.player_name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

// DD/MM/YYYY (UTC, para que no dependa de la zona horaria del servidor).
function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}
