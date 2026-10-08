"use client";

import { useEffect } from "react";
import { useReconnect } from "@/core/realtime/use-reconnect";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useAuth } from "@/shared/auth/auth.hooks";
import { STORAGE_READ_PERMISSION } from "@/modules/storage/domain/storage";
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store";

/**
 * El vigía del espacio (namespace `/inbox`, room de la company). Montado UNA
 * vez en el layout privado (`StorageQuotaWatcher`):
 * - `storage.quota_state` → el estado vivo de las subidas en el store.
 * - Con `storage:read`, siembra el estado con el resumen al entrar (así el clip
 *   ya llega apagado si el espacio estaba lleno) y lo relee al RECONECTAR: los
 *   eventos emitidos con el socket caído se perdieron.
 * Sin el permiso no pide nada: aprende del evento o del primer 507.
 */
export function useStorageQuotaRealtime(): void {
  const { socket, connected } = useSocket("inbox");
  const { status, hasPermission } = useAuth();
  const canRead = status === "authenticated" && hasPermission(STORAGE_READ_PERMISSION);

  useEffect(() => {
    if (canRead) void useStorageStore.getState().load();
  }, [canRead]);

  useSocketEvent(socket, "storage.quota_state", (payload) => {
    useStorageStore.getState().onQuotaState(payload);
  });

  useReconnect(connected, () => {
    if (canRead) void useStorageStore.getState().refresh();
  });
}
