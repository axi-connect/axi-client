"use client";

import { useRef } from "react";

import type { DocumentEventIdentity } from "@/core/realtime/events";
import { useReconnect } from "@/core/realtime/use-reconnect";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";

/**
 * `document.issued|failed|delivery_updated` llegan al room `company_{id}` del
 * namespace `/inbox` (automático al conectar). Todos comparten la identidad
 * del documento —ids, número, etiqueta—, suficiente para saber si nos
 * concierne; la lista se vuelve a pedir. El WS avisa, no sincroniza: ni el
 * estado del render ni el de la entrega se parchean desde el evento.
 *
 * En el flanco de RECONEXIÓN también se recarga: lo emitido o enviado con el
 * socket caído se perdió.
 */
export function useDocumentsSocket(options: {
  /** `false` = la sección no existe para este usuario: ni escucha ni recarga. */
  enabled?: boolean;
  concerns: (event: DocumentEventIdentity) => boolean;
  onChange: () => void | Promise<void>;
}): { connected: boolean } {
  const { socket, connected } = useSocket("inbox");
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handle = (event: DocumentEventIdentity) => {
    const current = optionsRef.current;
    if (current.enabled === false) return;
    if (current.concerns(event)) void current.onChange();
  };
  useSocketEvent(socket, "document.issued", handle);
  useSocketEvent(socket, "document.failed", handle);
  useSocketEvent(socket, "document.delivery_updated", handle);

  useReconnect(connected, () => {
    if (optionsRef.current.enabled !== false)
      void optionsRef.current.onChange();
  });

  return { connected };
}
