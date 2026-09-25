import "server-only";

import { HttpError } from "@/core/api/problem";
import { HttpClient } from "@/core/services/http";
import {
  PAYMENT_METHOD_CODES,
  type PaymentMethodCode,
  type WelcomeKitData,
  type WelcomeKitResult,
} from "../domain/welcome-kit";
import type { WelcomeKitDataWire } from "./welcome-kit.dto";

/** Hora del resumen de la mañana si el servidor no la manda (la del paquete de diseño). */
const DEFAULT_DIGEST_TIME = "07:30";

function isPaymentMethod(code: string): code is PaymentMethodCode {
  return (PAYMENT_METHOD_CODES as readonly string[]).includes(code);
}

export function welcomeKitFromWire(dto: WelcomeKitDataWire): WelcomeKitData {
  return {
    businessName: dto.businessName,
    ownerFirstName: dto.ownerFirstName,
    agentName: dto.agentName,
    agentTone: dto.agentTone ?? null,
    teamHours: dto.teamHours ?? null,
    loginEmail: dto.loginEmail,
    panelUrl: dto.panelUrl,
    // Un código que el kit no sabe pintar se descarta en vez de romper la página.
    paymentMethods: (dto.paymentMethods ?? []).filter(isPaymentMethod),
    catalog: {
      fileName: dto.catalog?.fileName ?? null,
      fileSizeBytes: dto.catalog?.fileSizeBytes ?? null,
      productCount: dto.catalog?.productCount ?? 0,
    },
    advisor: {
      fullName: dto.advisor.fullName,
      whatsappE164: dto.advisor.whatsappE164,
      digestTime: dto.advisor.digestTime || DEFAULT_DIGEST_TIME,
    },
    trial: { startDate: dto.trial.startDate, conversations: dto.trial.conversations },
    plan: {
      name: dto.plan.name,
      monthlyPriceCop: dto.plan.monthlyPriceCop,
      listPriceCop: dto.plan.listPriceCop,
      conversationsPerMonth: dto.plan.conversationsPerMonth,
    },
  };
}

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
