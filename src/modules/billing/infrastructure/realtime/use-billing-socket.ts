"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { useBillingStore } from "@/modules/billing/infrastructure/stores/billing.store";

/**
 * Tiempo real de facturación (namespace `/inbox`, room de la company).
 *
 * Los tres eventos los recibe quien tenga `billing:read`. El tenant **ya
 * suspendido no recibe ninguno** —su socket está cerrado desde el servidor—, así
 * que el aviso de suspensión nunca se diseña como algo que llega por WS: para él
 * existen el correo y el WhatsApp.
 */
export function useBillingSocket(): { connected: boolean } {
  const { socket, connected } = useSocket("inbox");
  const wasConnectedRef = useRef(false);

  useSocketEvent(socket, "billing.invoice_issued", (payload) => {
    useBillingStore.getState().onInvoiceIssued(payload);
  });

  useSocketEvent(socket, "billing.payment_approved", (payload) => {
    useBillingStore.getState().onPaymentApproved(payload);
  });

  useSocketEvent(socket, "billing.past_due", () => {
    useBillingStore.getState().onPastDue();
  });

  // En la RECONEXIÓN se recarga: los eventos emitidos mientras el socket estuvo
  // caído se perdieron, y en facturación quedarse con un saldo viejo significa
  // enseñarle una deuda a quien ya pagó. El guard evita recargar en el primer
  // connect, donde la vista acaba de pedir el dato.
  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void useBillingStore.getState().refresh();
    }
    wasConnectedRef.current = connected;
  }, [connected]);

  return { connected };
}
