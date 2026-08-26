"use client";

import { useEffect, useRef, useState } from "react";
import {
  confirmationDelay,
  outcomeFromStatus,
  shouldKeepPolling,
  type ConfirmationOutcome,
} from "@/modules/billing/domain/checkout";
import {
  getInvoice,
  getPublicInvoice,
} from "@/modules/billing/infrastructure/services/billing-service.adapter";

export type ConfirmationAmount = { cents: number; currency: string };

export type PaymentConfirmation = {
  outcome: ConfirmationOutcome;
  amount: ConfirmationAmount | null;
  /** Se agotaron los intentos sin desenlace: la pantalla deja de girar. */
  exhausted: boolean;
  /** Para que el camino autenticado pueda resolver por WebSocket. */
  resolve: (outcome: ConfirmationOutcome, amount?: ConfirmationAmount) => void;
};

/**
 * Repregunta el estado de una factura con backoff hasta que el desenlace esté
 * decidido, o hasta agotar los intentos.
 *
 * Con `token` consulta el endpoint público (el pagador no tiene sesión); sin él,
 * el autenticado. **No reintenta en bucle**: el público limita a 10 req/min por
 * IP y es estricto a propósito.
 */
export function usePaymentConfirmation(
  invoiceId: string | null,
  token?: string,
): PaymentConfirmation {
  const [outcome, setOutcome] = useState<ConfirmationOutcome>("pending");
  const [amount, setAmount] = useState<ConfirmationAmount | null>(null);
  const [exhausted, setExhausted] = useState(false);

  // El bucle lee el desenlace por ref: si dependiera del estado, cada cambio
  // reiniciaría el efecto y con él la cuenta de intentos.
  const settledRef = useRef(false);
  settledRef.current = !shouldKeepPolling(outcome);

  useEffect(() => {
    if (invoiceId === null) return;

    let attempt = 0;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function ask(): Promise<void> {
      try {
        if (token === undefined) {
          const detail = await getInvoice(invoiceId!);
          if (!alive) return;
          setAmount({ cents: detail.outstanding_cents, currency: detail.currency });
          setOutcome(outcomeFromStatus(detail.status, detail.outstanding_cents));
        } else {
          const view = await getPublicInvoice(invoiceId!, token);
          if (!alive) return;
          // `amount_cents` de la vista pública es lo que FALTA, no el total.
          setAmount({ cents: view.amount_cents, currency: view.currency });
          setOutcome(outcomeFromStatus(view.status, view.amount_cents));
        }
      } catch {
        // Un fallo puntual no decide nada: se deja al siguiente intento.
      }
      if (alive) schedule();
    }

    function schedule(): void {
      if (settledRef.current) return;
      const delay = confirmationDelay(attempt);
      if (delay === null) {
        setExhausted(true);
        return;
      }
      attempt += 1;
      timer = setTimeout(() => void ask(), delay);
    }

    schedule();
    return () => {
      alive = false;
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [invoiceId, token]);

  function resolve(next: ConfirmationOutcome, nextAmount?: ConfirmationAmount): void {
    setOutcome(next);
    if (nextAmount !== undefined) setAmount(nextAmount);
  }

  return { outcome, amount, exhausted, resolve };
}
