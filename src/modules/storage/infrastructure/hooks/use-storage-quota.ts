"use client";

import { UPLOADS_BLOCKED_HINT } from "@/modules/storage/domain/quota";
import { reportQuotaExceeded } from "@/modules/storage/infrastructure/notices/report-quota-exceeded";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";

/**
 * ¿Se puede subir? Lo leen el clip del inbox y los demás botones de subir
 * para apagarse ANTES de chocar con el 507 (T2). `unknown` = aún no se sabe:
 * se deja subir y manda el servidor. Solo lee el store: no exige proveedores.
 */
export function useStorageQuotaState(): {
  state: "ok" | "warning" | "full" | "unknown";
  blocksUploads: boolean;
  pctUsed: number | null;
  /** El tooltip a mostrar cuando `blocksUploads`. */
  blockedHint: string;
} {
  const state = useStorageStore((store) => store.live.state);
  const blocksUploads = useStorageStore((store) => store.live.blocks_uploads);
  const pctUsed = useStorageStore((store) => store.live.pct_used);
  return { state, blocksUploads, pctUsed, blockedHint: UPLOADS_BLOCKED_HINT };
}

/**
 * Helper compartido de las subidas, en forma de hook para los componentes:
 * `notify(err, fileName)` → `true` si era el 507 de espacio lleno (ya avisado),
 * `false` si no. Es `reportQuotaExceeded`, estable entre renders.
 */
export function useStorageQuotaNotice(): (error: unknown, fileName?: string | null) => boolean {
  return reportQuotaExceeded;
}
