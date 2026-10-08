/**
 * El espacio lleno visto desde las subidas (T2): el 507 `storage/quota_exceeded`
 * y el evento WS `storage.quota_state`. TypeScript puro: reconoce el error por
 * su forma (status + code), sin importar el cliente HTTP.
 */

export const STORAGE_QUOTA_EXCEEDED = "storage/quota_exceeded";
export const ATTACHMENT_PURGED = "conversations/attachment_purged";

export type QuotaScope = "tenant" | "platform_capacity";

export type QuotaExceededDetails = {
  scope: QuotaScope;
  used_bytes: number | null;
  quota_bytes: number | null;
  incoming_bytes: number | null;
  pct_used: number | null;
  category: string | null;
};

/** Estado vivo de la cuota: lo que necesitan las subidas para apagarse antes de chocar. */
export type LiveQuotaState = "ok" | "warning" | "full" | "unknown";

export type { StorageQuotaStateEvent } from "@/core/realtime/events";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Si `error` es el 507 de espacio lleno, sus detalles; si no, `null`. Acepta
 * cualquier error con `{ status, code, problem: { details } }` (el `HttpError`
 * del cliente).
 */
export function readQuotaExceeded(error: unknown): QuotaExceededDetails | null {
  const record = asRecord(error);
  if (!record || record.code !== STORAGE_QUOTA_EXCEEDED) return null;
  const details = asRecord(asRecord(record.problem)?.details) ?? {};
  return {
    scope: details.scope === "platform_capacity" ? "platform_capacity" : "tenant",
    used_bytes: asNumber(details.used_bytes),
    quota_bytes: asNumber(details.quota_bytes),
    incoming_bytes: asNumber(details.incoming_bytes),
    pct_used: asNumber(details.pct_used),
    category: typeof details.category === "string" ? details.category : null,
  };
}

/** El tooltip del clip y de los botones de subir cuando el espacio está lleno. */
export const UPLOADS_BLOCKED_HINT = "Tu espacio está lleno. Pide más espacio a un administrador o a soporte.";

/** Título de la píldora ≤ 34 caracteres (DESIGN-SYSTEM §9.4): el nombre se recorta con «…». */
const TITLE_MAX = 34;
const TITLE_FRAME = "No subimos «»".length;

export function quotaNoticeTitle(fileName?: string | null): string {
  const name = (fileName ?? "").trim();
  if (name === "") return "No subimos el archivo";
  const room = TITLE_MAX - TITLE_FRAME;
  const shown = name.length <= room ? name : `${name.slice(0, room - 1)}…`;
  return `No subimos «${shown}»`;
}

/**
 * La píldora del 507: qué archivo, por qué y qué hacer. Quien puede ver el
 * espacio (owner/admin) recibe además «Ver espacio».
 */
export function quotaNotice(
  details: QuotaExceededDetails,
  fileName: string | null | undefined,
  canSeeStorage: boolean,
): { title: string; description: string; showSeeStorage: boolean } {
  const title = quotaNoticeTitle(fileName);
  if (details.scope === "platform_capacity") {
    return {
      title,
      description: "El almacenamiento de Axi Connect está lleno por ahora. Ya lo estamos atendiendo; inténtalo más tarde.",
      showSeeStorage: false,
    };
  }
  return {
    title,
    description: canSeeStorage
      ? "Tu espacio está lleno. Pide más espacio a soporte para seguir subiendo archivos."
      : UPLOADS_BLOCKED_HINT,
    showSeeStorage: canSeeStorage,
  };
}
