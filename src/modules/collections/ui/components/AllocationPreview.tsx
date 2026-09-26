"use client";

import { Check } from "lucide-react";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import {
  allocationPreview,
  type PlanDetailDTO,
} from "@/modules/collections/domain/payment-plan";

/**
 * «Se reparte así» (Cobros premium P4): cómo caería el abono en las cuotas si
 * se verifica, con la misma regla FIFO del servidor. Va dentro del diálogo de
 * registrar pago; sin monto no hay nada que repartir y no se pinta.
 */
export function AllocationPreview({
  plan,
  amountCents,
}: {
  plan: Pick<PlanDetailDTO, "installments" | "currency">;
  amountCents: number | null;
}) {
  if (amountCents === null || amountCents <= 0) return null;
  const { lines, unallocated_cents } = allocationPreview(
    plan.installments,
    amountCents,
  );
  if (lines.length === 0) return null;
  return (
    <section
      aria-label="Cómo se reparte el abono"
      className="rounded-2xl bg-muted px-4 pt-2 pb-1"
    >
      <p className="pt-1.5 pb-1 text-xs text-muted-foreground">
        Si se verifica, se reparte así: primero lo que vence antes
      </p>
      <ul className="m-0 list-none p-0">
        {lines.map((line) => (
          <li
            key={line.installment.id}
            className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-[22px] place-items-center rounded-full",
                line.state === "settled" && "bg-foreground text-background",
                line.state === "partial" &&
                  "border-2 border-foreground bg-[linear-gradient(90deg,var(--color-foreground)_50%,transparent_50%)]",
                line.state === "untouched" && "border-[1.5px] border-border",
              )}
            >
              {line.state === "settled" ? (
                <Check className="size-3" strokeWidth={3} />
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[13.5px] font-medium">
                {line.label}
              </span>
              <span className="block text-xs text-muted-foreground">
                vence el {formatShortDate(line.installment.due_at)} ·{" "}
                {line.state === "settled"
                  ? "queda saldada"
                  : line.state === "partial"
                    ? `faltan ${formatMoney(line.left_cents, plan.currency)}`
                    : "sin cambios"}
              </span>
            </span>
            <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
              {line.applied_cents === 0
                ? "—"
                : formatMoney(line.applied_cents, plan.currency)}
            </span>
          </li>
        ))}
      </ul>
      {unallocated_cents > 0 ? (
        <p className="border-t border-border/60 py-2.5 text-xs text-foreground tabular-nums">
          Sobran {formatMoney(unallocated_cents, plan.currency)}: no hay cuota
          donde ponerlos.
        </p>
      ) : null}
    </section>
  );
}
