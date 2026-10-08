"use client";

import { useQuotaExceededAlerts } from "@/modules/storage/infrastructure/hooks/use-quota-exceeded-alerts";
import { useStorageQuotaRealtime } from "@/modules/storage/infrastructure/realtime/use-storage-quota-realtime";

/**
 * Vigía del espacio para todo el panel: no pinta nada. Lo monta el layout
 * privado (como la campana monta el realtime de notificaciones):
 * - mantiene al día el estado de las subidas (WS `storage.quota_state`);
 * - pinta la píldora del 507 que cualquier subida señala con
 *   `reportQuotaExceeded`.
 */
export function StorageQuotaWatcher() {
  useStorageQuotaRealtime();
  useQuotaExceededAlerts();
  return null;
}
