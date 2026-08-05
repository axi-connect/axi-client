"use client";

import { useEffect, useRef, useState } from "react";
import { socketManager, type TypedSocket } from "./socket-manager";
import type { RealtimeNamespace, ServerEventsOf } from "./events";

/**
 * Hook base de conexión a un namespace de tiempo real.
 *
 * Mantiene la conexión viva mientras haya al menos un consumidor montado
 * (contador de referencias) y expone el socket + estado de conexión.
 * Los hooks de cada slice componen sobre este.
 */

const consumers = new Map<RealtimeNamespace, number>();

export function useSocket<N extends RealtimeNamespace>(namespace: N) {
  const [socket, setSocket] = useState<TypedSocket<N> | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Listeners propios de ESTE consumidor: hay que poder quitarlos al
    // desmontar. Sin esto se acumulaban en el socket compartido (que sobrevive
    // a la navegación) y disparaban `setState` sobre componentes ya muertos.
    let detach: (() => void) | undefined;
    consumers.set(namespace, (consumers.get(namespace) ?? 0) + 1);

    socketManager
      .connect(namespace)
      .then((s) => {
        if (cancelled) return;
        setSocket(s);
        setConnected(s.connected);
        const onConnect = () => setConnected(true);
        const onDisconnect = () => setConnected(false);
        s.on("connect", onConnect);
        s.on("disconnect", onDisconnect);
        detach = () => {
          s.off("connect", onConnect);
          s.off("disconnect", onDisconnect);
        };
      })
      .catch(() => {
        // Sin sesión válida: el manager reintenta con backoff; el estado queda desconectado.
      });

    return () => {
      cancelled = true;
      detach?.();
      const remaining = (consumers.get(namespace) ?? 1) - 1;
      consumers.set(namespace, remaining);
      if (remaining <= 0) {
        consumers.delete(namespace);
        socketManager.disconnect(namespace);
      }
    };
  }, [namespace]);

  return { socket, connected };
}

/**
 * Suscripción declarativa a un evento server→client con cleanup automático.
 * El handler se mantiene fresco vía ref (no re-suscribe en cada render).
 */
export function useSocketEvent<
  N extends RealtimeNamespace,
  E extends keyof ServerEventsOf<N> & string,
>(
  socket: TypedSocket<N> | null,
  event: E,
  handler: ServerEventsOf<N>[E],
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!socket) return;
    const listener = (...args: unknown[]) =>
      (handlerRef.current as (...a: unknown[]) => void)(...args);
    // Cast necesario: socket.io tipa `on` con el mapa de eventos completo y
    // aquí el nombre llega como unión genérica.
    (socket as { on(e: string, l: (...a: unknown[]) => void): void }).on(event, listener);
    return () => {
      (socket as { off(e: string, l: (...a: unknown[]) => void): void }).off(event, listener);
    };
  }, [socket, event]);
}
