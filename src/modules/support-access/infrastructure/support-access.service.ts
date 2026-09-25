import { SUPPORT_PLATFORM_TOKEN_HEADER } from "@/shared/auth/auth.types";

/**
 * Llamadas del navegador a los BFF del acceso de soporte. Nunca ven el token
 * de soporte: vive en la cookie httpOnly que escribe el BFF.
 */

export type RedeemResult =
  | { ok: true; redirect: string }
  | { ok: false; status: number; code: string | undefined };

export async function redeemSupportCode(code: string, platformToken: string): Promise<RedeemResult> {
  let res: Response;
  try {
    res = await fetch("/api/auth/support/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json", [SUPPORT_PLATFORM_TOKEN_HEADER]: platformToken },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 503, code: "client/network" };
  }
  let body: { code?: string; redirect?: string } = {};
  try {
    body = await res.json();
  } catch {
    // Sin cuerpo JSON: se decide por el status.
  }
  if (!res.ok) return { ok: false, status: res.status, code: body.code };
  return { ok: true, redirect: typeof body.redirect === "string" && body.redirect.startsWith("/") ? body.redirect : "/dashboard" };
}

/** «Salir»: cierra la sesión de soporte en el backend y borra su cookie. Nunca lanza. */
export async function endSupportSession(): Promise<void> {
  try {
    await fetch("/api/auth/support/end", { method: "POST", cache: "no-store" });
  } catch {
    // La cookie vence sola; la pestaña se cierra igual.
  }
}
