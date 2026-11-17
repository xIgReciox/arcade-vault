import type { Metadata } from "next";
import { About } from "@/components/about/about";
import { RevealObserver } from "@/components/home/reveal-observer";

export const metadata: Metadata = {
  title: "Acerca de · Arcade Vault",
  description:
    "Conoce la misión de Arcade Vault y escríbenos: sugerencias, juegos que quieras ver o simplemente un saludo.",
};

export default function AboutPage() {
  return (
    <>
      <About />
      <RevealObserver />
    </>
  );
}
