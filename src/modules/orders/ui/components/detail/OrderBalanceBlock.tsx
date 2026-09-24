"use client";

import { CalendarDays } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import {
  daysUntilService,
  PAYMENT_STATE_LABELS,
  type OrderDTO,
} from "@/modules/orders/domain/order";
import { PaymentMeter } from "@/modules/orders/ui/components/PaymentMeter";
// El dueño de la tasa es el slice payments: se consume por su barrel (§3.3).
import { useIndicativeQuote } from "@/modules/payments/public";

/** «Sale en 179 días» dice más que una fecha suelta: es lo que urge el saldo. */
function serviceCountdown(days: number): string {
  if (days < 0) return "La salida ya pasó";
  if (days === 0) return "Sale hoy";
  if (days === 1) return "Sale mañana";
  return `Sale en ${String(days)} días`;
}

/**
 * Lo primero del pedido: cuánto falta por cobrar (F3 del programa Cobros).
 *
 * El operador abre un pedido para responder esa pregunta, así que es la cifra
 * grande y el total baja a línea de apoyo; antes eran tres filas del mismo peso
 * y había que restar. Debajo, el medidor, la cuenta atrás de la salida y —solo
 * si el pedido se congeló— de dónde sale el precio.
 */
export function OrderBalanceBlock({ order }: { order: OrderDTO }) {
  const settled = order.payment_state === "paid";
  const days = daysUntilService(order.service_date);
  // Solo mientras el total NO está congelado: después manda la tasa del pedido.
  const quote = useIndicativeQuote(order.currency, order.base === null && !settled);

  return (
    <section aria-label="Cobro del pedido" className="rounded-2xl border border-border bg-background p-4">
      <p className="text-xs text-muted-foreground">
        {settled ? "Cobrado por completo" : "Falta por cobrar"}
      </p>
      <p
        className={`mt-1 font-headings text-[34px] leading-none tracking-tight tabular-nums ${settled ? "text-success" : ""}`}
      >
        {formatMoney(settled ? order.total_cents : order.balance_cents, order.currency)}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
        {settled ? (
          <>Se cobró el total de {formatMoney(order.total_cents, order.currency)}</>
        ) : (
          <>
            de {formatMoney(order.total_cents, order.currency)}
            {order.paid_cents > 0 ? (
              <>
                {" · "}
                <span className="font-medium text-foreground">
                  {formatMoney(order.paid_cents, order.currency)}
                </span>{" "}
                cobrado
              </>
            ) : (
              <> · {PAYMENT_STATE_LABELS[order.payment_state].toLowerCase()}</>
            )}
          </>
        )}
      </p>

      <PaymentMeter order={order} className="mt-3.5" />

      {order.service_date !== null && days !== null ? (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-secondary px-3.5 py-3">
          <CalendarDays aria-hidden="true" className="size-[18px] text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{serviceCountdown(days)}</p>
            <p className="text-xs text-muted-foreground">{formatShortDate(order.service_date)}</p>
          </div>
        </div>
      ) : null}

      {order.base === null && quote !== null ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          ≈{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(Math.round(order.balance_cents * quote.rate), quote.currency)}
          </span>{" "}
          a la tasa de hoy (
          <span className="tabular-nums">
            {quote.rate.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          </span>
          ). Es indicativo: el total se fija en {quote.currency} al confirmar el pedido.
        </p>
      ) : null}

      {order.base !== null ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Cotizado en{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(order.base.total_cents, order.base.currency)}
          </span>
          . El total quedó fijo el {formatShortDate(order.base.frozen_at.slice(0, 10))} a{" "}
          <span className="font-medium text-foreground tabular-nums">
            {order.base.fx_rate.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
          </span>{" "}
          por {order.base.currency}.
        </p>
      ) : null}
    </section>
  );
}
