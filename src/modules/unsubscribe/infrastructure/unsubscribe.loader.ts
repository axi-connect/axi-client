import "server-only";

import { HttpError } from "@/core/api/problem";
import { HttpClient } from "@/core/services/http";

/**
 * La baja de un correo o SMS en frío (P3a), sin sesión: la autoriza el token
 * firmado de la ruta. `GET` dice de quién se da de baja; `POST` la registra.
 *
 * Nunca lanza: un token inválido es `gone` (el servidor responde 404 igual para
 * todo), un 429 es `busy` y lo demás `unavailable`. El token no va a los logs.
 */
export type UnsubscribeView = { sender_name: string; channel: "email" | "sms"; destination_masked: string };
export type UnsubscribeResult =
  | { status: "ok"; view: UnsubscribeView }
  | { status: "gone" | "busy" | "unavailable" };

const TOKEN = /^[A-Za-z0-9_.-]{16,512}$/;

export function loadUnsubscribe(token: string, headers: Record<string, string> = {}): Promise<UnsubscribeResult> {
  return call("GET", token, headers);
}

export function confirmUnsubscribe(token: string, headers: Record<string, string> = {}): Promise<UnsubscribeResult> {
  return call("POST", token, headers);
}

async function call(method: "GET" | "POST", token: string, headers: Record<string, string>): Promise<UnsubscribeResult> {
  if (!TOKEN.test(token)) return { status: "gone" };
  const path = `/public/outreach/unsubscribe/${encodeURIComponent(token)}`;
  const client = new HttpClient();
  try {
    const view =
      method === "GET"
        ? await client.get<UnsubscribeView>(path, undefined, { authenticate: false, headers })
        : await client.post<UnsubscribeView>(path, {}, { authenticate: false, headers });
    return { status: "ok", view };
  } catch (error) {
    if (error instanceof HttpError && [400, 404, 410].includes(error.status)) return { status: "gone" };
    if (error instanceof HttpError && error.status === 429) return { status: "busy" };
    console.warn(
      "[unsubscribe] la baja no respondió",
      error instanceof HttpError ? { status: error.status, code: error.code } : String(error),
    );
    return { status: "unavailable" };
  }
}
