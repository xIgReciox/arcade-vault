import type { Metadata } from "next";
import { Suspense } from "react";
import { HallOfFame } from "@/components/hall-of-fame";
import type { ScoreRow } from "@/lib/games";
import { getLeaderboard, getRegisteredGameIds } from "@/lib/scores";

export const metadata: Metadata = {
  title: "Salón de la Fama · Arcade Vault",
  description: "Los mejores jugadores de cada juego de Arcade Vault.",
};

// La lectura de Supabase usa cookies: con cacheComponents debe ir dentro de <Suspense>.
export default function SalonPage() {
  return (
    <Suspense fallback={null}>
      <SalonContent />
    </Suspense>
  );
}

async function SalonContent() {
  const ids = await getRegisteredGameIds();
  const boards = await Promise.all(ids.map((id) => getLeaderboard(id, 12)));
  const realRows: Record<string, ScoreRow[]> = Object.fromEntries(
    ids.map((id, i) => [id, boards[i]]),
  );

  return <HallOfFame realRows={realRows} />;
}
