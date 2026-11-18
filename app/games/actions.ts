"use server";

import {
  MAX_SCORE,
  PLAYER_NAME_RE,
  type SubmitScoreInput,
  type SubmitScoreResult,
} from "@/lib/scores";
import { createClient } from "@/lib/supabase/server";

export async function submitScore(input: SubmitScoreInput): Promise<SubmitScoreResult> {
  // Los argumentos de una Server Action llegan del cliente: no se confía en sus tipos.
  const { gameId, playerName, score } = (input ?? {}) as Partial<SubmitScoreInput>;

  if (typeof gameId !== "string" || gameId.length === 0) {
    return { ok: false, error: "Juego no válido." };
  }
  if (typeof playerName !== "string" || !PLAYER_NAME_RE.test(playerName)) {
    return { ok: false, error: "El nombre debe tener de 3 a 12 caracteres (A-Z, 0-9 o _)." };
  }
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    return { ok: false, error: "Puntuación no válida." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("scores")
      .insert({ game_id: gameId, player_name: playerName, score, user_id: null });

    if (error) {
      console.error("submitScore: error de Supabase", error.code, error.message);
      return { ok: false, error: "No se pudo guardar la puntuación. Inténtalo de nuevo." };
    }
  } catch (err) {
    console.error("submitScore: error inesperado", err);
    return { ok: false, error: "No se pudo guardar la puntuación. Inténtalo de nuevo." };
  }

  return { ok: true };
}
