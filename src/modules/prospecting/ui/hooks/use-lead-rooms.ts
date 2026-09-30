"use client";

import { useEffect, useRef } from "react";

import { socketManager, type TypedSocket } from "@/core/realtime/socket-manager";

/**
 * Estar en la sala de VARIOS leads a la vez (P2, auditoría B3).
 *
 * El paso a paso de un enriquecimiento o de un revelado va a la sala del lead,
 * no a la del tenant: un lote de cien leads serían cientos de mensajes para
 * todos los paneles abiertos. Quien revela a cinco personas desde la tabla se
 * une a esas cinco salas mientras espera, y sale cuando dejan de importar.
 *
 * Al reconectar, la membresía se perdió con la conexión: se vuelve a entrar y
 * se avisa con `onResync`, porque lo que pasó mientras tanto no llegó a nadie.
 */
export function useLeadRooms(
  socket: TypedSocket<"inbox"> | null,
  leadIds: readonly string[],
  onResync: () => void,
): void {
  const joined = useRef<Set<string>>(new Set());
  const resync = useRef(onResync);
  resync.current = onResync;
  const key = [...leadIds].sort().join(",");

  useEffect(() => {
    if (socket === null) return;
    const wanted = new Set(key === "" ? [] : key.split(","));

    const join = (leadId: string) => {
      socketManager
        .emitWithAck(socket, "inbox.join_lead", { lead_id: leadId })
        .then((ack) => {
          if (ack.ok) joined.current.add(leadId);
        })
        .catch(() => {
          // Timeout: el próximo `connect` reintenta.
        });
    };
    const leave = (leadId: string) => {
      joined.current.delete(leadId);
      socketManager.emitWithAck(socket, "inbox.leave_lead", { lead_id: leadId }).catch(() => {
        // Salir es best-effort: si el socket murió, la sala murió con él.
      });
    };

    for (const leadId of [...joined.current]) if (!wanted.has(leadId)) leave(leadId);
    for (const leadId of wanted) if (!joined.current.has(leadId)) join(leadId);

    const onConnect = () => {
      joined.current.clear();
      for (const leadId of wanted) join(leadId);
      if (wanted.size > 0) resync.current();
    };
    const onDisconnect = () => joined.current.clear();
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [socket, key]);

  // Al desmontar la vista, fuera de todas.
  useEffect(
    () => () => {
      if (socket === null) return;
      for (const leadId of joined.current) {
        socketManager.emitWithAck(socket, "inbox.leave_lead", { lead_id: leadId }).catch(() => {});
      }
      joined.current.clear();
    },
    [socket],
  );
}
