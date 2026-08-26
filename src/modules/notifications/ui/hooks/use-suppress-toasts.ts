"use client";

import { useEffect } from "react";
import { useNotificationsStore } from "@/modules/notifications/infrastructure/stores/notifications.store";

/**
 * Silencia el toast y el sonido de una familia de notificaciones mientras la
 * vista que las muestra está montada.
 *
 * El badge y las listas de la campanita **se siguen actualizando**: lo único que
 * se suprime es el aviso flotante, porque avisar por encima de la pantalla que
 * ya está mostrando ese hecho es ruido.
 *
 * Encapsula el efecto para que cada consumidor no repita el par
 * suppress/unsuppress y se le olvide el cleanup — un `unsuppress` perdido deja
 * la familia muda para el resto de la sesión.
 */
export function useSuppressToasts(prefix: string): void {
  const suppress = useNotificationsStore((state) => state.suppressToasts);
  const unsuppress = useNotificationsStore((state) => state.unsuppressToasts);

  useEffect(() => {
    suppress(prefix);
    return () => unsuppress(prefix);
  }, [prefix, suppress, unsuppress]);
}
