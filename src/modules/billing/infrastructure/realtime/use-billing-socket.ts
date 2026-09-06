"use client";

import { useEffect, useRef } from "react";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { BILLING_INVOICE_CHANGED } from "@/modules/billing/domain/events";
import { useActivationStore } from "@/modules/billing/infrastructure/stores/activation.store";
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
    // La lista de facturas tiene su propia paginación y no vive en el store:
    // se le avisa por el bus del DOM en vez de acoplar las dos superficies.
    window.dispatchEvent(new CustomEvent(BILLING_INVOICE_CHANGED));
  });

  useSocketEvent(socket, "billing.payment_approved", (payload) => {
    useBillingStore.getState().onPaymentApproved(payload);
    window.dispatchEvent(new CustomEvent(BILLING_INVOICE_CHANGED));
  });

  useSocketEvent(socket, "billing.past_due", () => {
    useBillingStore.getState().onPastDue();
  });

  // Tanda B: la activación se pagó (platform activa el plan) o su link venció.
  // La tarjeta y el resumen se releen: el estado de cuenta cambia de «en
  // prueba» a «al día» sin que el cliente recargue.
  useSocketEvent(socket, "billing.activation_paid", () => {
    useActivationStore.getState().onActivationChanged();
    void useBillingStore.getState().refresh();
    window.dispatchEvent(new CustomEvent(BILLING_INVOICE_CHANGED));
  });
  useSocketEvent(socket, "billing.activation_expired", () => {
    useActivationStore.getState().onActivationChanged();
    window.dispatchEvent(new CustomEvent(BILLING_INVOICE_CHANGED));
  });

  // En la RECONEXIÓN se recarga: los eventos emitidos mientras el socket estuvo
  // caído se perdieron, y en facturación quedarse con un saldo viejo significa
  // enseñarle una deuda a quien ya pagó. El guard evita recargar en el primer
  // connect, donde la vista acaba de pedir el dato.
  useEffect(() => {
    if (connected && wasConnectedRef.current) {
      void useBillingStore.getState().refresh();
      if (useActivationStore.getState().view !== null) {
        void useActivationStore.getState().refresh();
      }
    }
    wasConnectedRef.current = connected;
  }, [connected]);

  return { connected };
}
