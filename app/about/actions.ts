"use server";

import { Resend } from "resend";

export type ContactState =
  | { status: "idle" }
  | { status: "success"; name: string }
  | { status: "error"; message: string };

// FormData esperado: name, email, msg, website (honeypot, debe llegar vacío)

const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR = "No pudimos enviar tu mensaje. Inténtalo de nuevo en unos minutos.";

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function fail(message: string): ContactState {
  return { status: "error", message };
}

export async function sendContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const msg = field(formData, "msg");
  const website = field(formData, "website");

  // Honeypot: un bot lo rellena. Se responde éxito sin enviar nada.
  if (website) return { status: "success", name: name || "JUGADOR" };

  if (!name || !email || !msg) return fail("Completa todos los campos.");
  if (name.length > MAX_NAME) return fail(`El nombre no puede superar ${MAX_NAME} caracteres.`);
  if (email.length > MAX_EMAIL) return fail(`El correo no puede superar ${MAX_EMAIL} caracteres.`);
  if (msg.length > MAX_MSG) return fail(`El mensaje no puede superar ${MAX_MSG} caracteres.`);
  if (!EMAIL_RE.test(email)) return fail("Escribe un correo electrónico válido.");

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !to || !from) {
    console.error("[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL");
    return fail(GENERIC_ERROR);
  }

  // \s cubre \r, \n, U+2028 y U+2029: sin saltos de línea en el asunto (evita inyección de cabeceras).
  const subjectName = name.replace(/\s+/g, " ").trim();

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `[Arcade Vault] Mensaje de ${subjectName}`,
      text: `Nombre: ${subjectName}\nCorreo: ${email}\n\n${msg}`,
    });
    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return fail(GENERIC_ERROR);
    }
  } catch (err) {
    console.error("[contact] Error enviando el correo:", err);
    return fail(GENERIC_ERROR);
  }

  return { status: "success", name };
}
