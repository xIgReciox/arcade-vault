import type { Metadata } from "next";
import { Home } from "@/components/home/home";
import { RevealObserver } from "@/components/home/reveal-observer";

export const metadata: Metadata = {
  title: "Arcade Vault · El arcade clásico está de vuelta",
  description:
    "Juega los mejores clásicos arcade en tu navegador, sin descargas y gratis. Compite por el puntaje más alto.",
};

export default function HomePage() {
  return (
    <>
      <Home />
      <RevealObserver />
    </>
  );
}
