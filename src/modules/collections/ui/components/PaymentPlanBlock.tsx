"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Handshake, Plane } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  installmentLabel,
  INSTALLMENT_STATUS_LABELS,
  type InstallmentDTO,
  type PlanDetailDTO,
} from "@/modules/collections/domain/payment-plan";
import { daysUntil } from "@/modules/collections/domain/receivable";
import { getPlanByOrder } from "@/modules/collections/infrastructure/services/collections-service.adapter";

const DOT_TONE: Record<string, string> = {
  paid: "bg-success",
  partially_paid: "bg-info",
  overdue: "bg-destructive",
  pending: "bg-border",
  waived: "bg-border",
};

/**
 * El plan de pagos dentro del pedido (F4).
 *
 * Una lista agrupada con un punto por cuota —el idioma que F3 dejó en el rail—
 * y, al pie, de dónde salió el calendario: es la pregunta que sigue a «¿por qué
 * tres cuotas?».
 *
 * Un pedido sin plan no pinta nada. No es un error ni un vacío que explicar:
 * el negocio puede no tener la función, o el pedido puede ser anterior.
 */
export function PaymentPlanBlock({ orderId }: { orderId: string }) {
  const [plan, setPlan] = useState<PlanDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getPlanByOrder(orderId)
      .then((result) => {
        if (alive) setPlan(result);
      })
      .catch(() => {
        // 404 sin plan y 403 sin la función son el mismo silencio: esta
        // sección simplemente no existe para este pedido.
        if (alive) setPlan(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [orderId]);

  if (loading) return <Skeleton className="h-40 w-full rounded-2xl" />;
  if (plan === null) return null;

  const next = plan.installments.find(
    (installment) => installment.status !== "paid" && installment.status !== "waived",
  );

  return (
    <section aria-label="Plan de pagos" className="flex flex-col gap-4">
      {plan.active_promise_at !== null ? (
        <div className="flex items-start gap-3 rounded-[15px] bg-secondary px-4 py-3.5 text-[13px] leading-relaxed">
          <Handshake aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
          <p>
            <b className="font-medium">
              Prometió pagar el {formatShortDate(plan.active_promise_at)}.
            </b>{" "}
            Los recordatorios quedan en pausa hasta ese día.
          </p>
        </div>
      ) : next !== undefined ? (
        <NextDue installment={next} currency={plan.currency} />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-background">
        <p className="px-4 pb-0.5 pt-3.5 text-[12.5px] text-muted-foreground">Plan de pagos</p>
        {plan.installments.map((installment) => (
          <InstallmentRow
            key={installment.id}
            installment={installment}
            total={plan.installments.length}
            currency={plan.currency}
          />
        ))}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        El plan se creó al confirmar el pedido, con la política del negocio. Las cuotas dicen{" "}
        <b className="font-medium text-foreground">cuándo</b> tocaba cada parte; lo cobrado sale del
        pedido.
      </p>
    </section>
  );
}

function NextDue({ installment, currency }: { installment: InstallmentDTO; currency: string }) {
  const days = daysUntil(installment.due_at);
  const late = installment.status === "overdue";
  return (
    <div
      className={`flex items-center gap-3.5 rounded-[15px] px-4 py-3.5 ${late ? "bg-destructive/[0.07]" : "bg-secondary"}`}
    >
      {late ? (
        <Plane aria-hidden="true" className="size-[18px] shrink-0 text-destructive" />
      ) : (
        <CalendarClock aria-hidden="true" className="size-[18px] shrink-0 text-muted-foreground" />
      )}
      <div>
        <p className="text-sm font-medium">
          {late
            ? `Vencida hace ${String(Math.abs(days ?? 0))} días`
            : days === null
              ? "Próxima cuota"
              : days <= 0
                ? "Vence hoy"
                : `Próxima cuota en ${String(days)} días`}
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">
          {formatMoney(installment.amount_cents - installment.paid_cents, currency)} ·{" "}
          {formatShortDate(installment.due_at)}
        </p>
      </div>
    </div>
  );
}

function InstallmentRow({
  installment,
  total,
  currency,
}: {
  installment: InstallmentDTO;
  total: number;
  currency: string;
}) {
  const paid = installment.status === "paid";
  return (
    <div className="relative grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 [&+&]:before:absolute [&+&]:before:left-[53px] [&+&]:before:right-0 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border/60">
      <span
        aria-hidden="true"
        className={`size-[7px] justify-self-center rounded-full ${DOT_TONE[installment.status] ?? "bg-border"}`}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium">{installmentLabel(installment, total)}</p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {paid && installment.paid_at !== null
            ? `Pagada el ${formatShortDate(installment.paid_at)}`
            : `Vence el ${formatShortDate(installment.due_at)}`}
        </p>
      </div>
      <p className="text-right text-sm font-medium tabular-nums">
        {formatMoney(installment.amount_cents, currency)}
        {paid ? null : (
          <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
            {INSTALLMENT_STATUS_LABELS[installment.status]}
          </span>
        )}
      </p>
    </div>
  );
}
