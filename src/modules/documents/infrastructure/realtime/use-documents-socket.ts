"use client";

import { useEffect, useRef } from "react";

import type { DocumentLifecycleEvent } from "@/core/realtime/events";
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
  // «Alguna vez conectado»: la reconexión es la SEGUNDA subida. Un flag que se
  // apaga al caer el socket no la vería nunca.
  const everConnectedRef = useRef(false);

  const handle = (event: DocumentLifecycleEvent) => {
    const current = optionsRef.current;
    if (current.enabled === false) return;
    if (current.concerns(event)) void current.onChange();
  };
  useSocketEvent(socket, "document.issued", handle);
  useSocketEvent(socket, "document.failed", handle);

  useEffect(() => {
    if (!connected) return;
    if (everConnectedRef.current && optionsRef.current.enabled !== false) {
      void optionsRef.current.onChange();
    }
    everConnectedRef.current = true;
  }, [connected]);

  return { connected };
}
