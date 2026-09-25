import "server-only";

import { HttpError } from "@/core/api/problem";
import { HttpClient } from "@/core/services/http";
import type { WelcomeKitResult } from "../domain/welcome-kit";
import type { WelcomeKitDataWire } from "./welcome-kit.dto";
import { welcomeKitFromWire } from "./welcome-kit.mapper";

/**
 * Carga el kit en el servidor (RSC), sin sesión: lo autoriza el token de la
 * ruta. `GET /public/welcome/:token` sale con `no-store` —el kit vence a los 30
 * días o al activar el plan, así que una copia en caché serviría un kit muerto.
 *
 * Nunca lanza. 400, 404 y 410 son el kit vencido o inexistente (el servidor no
 * distingue a propósito); cualquier otra cosa es «no disponible ahora».
 *
 * Un 429 es el throttle del endpoint público: pasa solo, así que la pantalla
 * pide recargar en vez de decir «no disponible».
 *
 * `clientHeaders` son la IP del visitante (`X-Forwarded-For`/`X-Real-IP`, ver
 * `clientIpHeaders`): la petición sale del servidor de Next y, sin ellas, el
 * throttle por IP del backend contaría a todos los visitantes juntos.
 *
 * El token NO va a los logs: solo el estado y el código del error.
 */
export async function loadWelcomeKit(
  token: string,
  clientHeaders: Record<string, string> = {},
): Promise<WelcomeKitResult> {
  if (!/^[A-Za-z0-9_-]{16,256}$/.test(token)) return { status: "gone" };
  try {
    const dto = await new HttpClient().get<WelcomeKitDataWire>(
      `/public/welcome/${encodeURIComponent(token)}`,
      undefined,
      { authenticate: false, headers: clientHeaders },
    );
    return { status: "ok", data: welcomeKitFromWire(dto) };
  } catch (error) {
    if (error instanceof HttpError && [400, 404, 410].includes(error.status)) {
      return { status: "gone" };
    }
    if (error instanceof HttpError && error.status === 429) return { status: "busy" };
    const detail =
      error instanceof HttpError
        ? { status: error.status, code: error.code }
        : { message: error instanceof Error ? error.message : String(error) };
    console.warn("[welcome-kit] el kit no respondió", detail);
    return { status: "unavailable" };
  }
}
