import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Acceso · Arcade Vault",
  description: "Inicia sesión, crea tu cuenta o juega como invitado.",
};

export default function AuthPage() {
  return <AuthForm />;
}
