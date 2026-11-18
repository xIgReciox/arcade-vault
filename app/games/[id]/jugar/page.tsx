import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlayer } from "@/components/game-player";
import { GAMES, getGame } from "@/lib/games";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = getGame(id);
  if (!game) return { title: "Juego no encontrado · Arcade Vault" };
  return { title: `Jugando ${game.title} · Arcade Vault`, description: game.short };
}

// `params` se lee dentro de <Suspense> para que el App Shell no dependa de la URL.
async function Player({ params }: { params: PageProps<"/games/[id]/jugar">["params"] }) {
  const { id } = await params;
  const game = getGame(id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}

export default function PlayPage({ params }: PageProps<"/games/[id]/jugar">) {
  return (
    <Suspense fallback={null}>
      <Player params={params} />
    </Suspense>
  );
}
