"use client";

import { useRef } from "react";

import type { DocumentLifecycleEvent } from "@/core/realtime/events";
import { useReconnect } from "@/core/realtime/use-reconnect";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";

/**
 * `document.issued|failed` llegan al room `company_{id}` del namespace
 * `/inbox` (automático al conectar). El payload trae ids, número y estado —
 * suficiente para saber si nos concierne—; la lista se vuelve a pedir.
 *
 * En el flanco de RECONEXIÓN también se recarga: lo emitido con el socket
 * caído se perdió.
 */
export function useDocumentsSocket(options: {
  /** `false` = la sección no existe para este usuario: ni escucha ni recarga. */
  enabled?: boolean;
  concerns: (event: DocumentLifecycleEvent) => boolean;
  onChange: () => void | Promise<void>;
}): { connected: boolean } {
  const { socket, connected } = useSocket("inbox");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handle = (event: DocumentLifecycleEvent) => {
    const current = optionsRef.current;
    if (current.enabled === false) return;
    if (current.concerns(event)) void current.onChange();
  };
  useSocketEvent(socket, "document.issued", handle);
  useSocketEvent(socket, "document.failed", handle);

  useReconnect(connected, () => {
    if (optionsRef.current.enabled !== false)
      void optionsRef.current.onChange();
  });

  return { connected };
}
