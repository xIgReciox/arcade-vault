import type { Metadata } from "next";
import { Library } from "@/components/library";

export const metadata: Metadata = {
  title: "Biblioteca · Arcade Vault",
  description: "Explora todos los juegos de Arcade Vault y compite por el puntaje más alto.",
};

export default function GamesPage() {
  return <Library />;
}
