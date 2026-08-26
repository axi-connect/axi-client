"use client";

/**
 * Tarifas (`/platform/billing/prices`).
 *
 * **Una tarifa se SUCEDE, no se edita**: no hay campo de importe editable en
 * línea, solo «Publicar nueva tarifa». Una factura ya emitida debe conservar el
 * precio con el que se vendió, así que publicar cierra la vigencia anterior y
 * crea una fila nueva.
 *
 * La línea de tiempo de vigencias no es decoración: es lo único que explica por
 * qué una factura de junio dice otro importe.
 */
import { useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { taxLabel } from "@/modules/billing/domain/tax";
import {
  INTERVAL_LABELS,
  OVERAGE_METRIC_LABELS,
  PRICE_VIGENCY_MAP,
  includedLabel,
  unitSizeLabel,
  vigencyKey,
  type BillingPrice,
} from "../../../domain/billing";
import { useBillingPricesQuery } from "../../../infrastructure/api/hooks/use-billing";
import { usePlansQuery } from "../../../infrastructure/api/hooks/use-plans";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { PublishPriceSheet } from "./PublishPriceSheet";

export function PricesView() {
  const plans = usePlansQuery();
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [publishing, setPublishing] = useState(false);

  const planList = useMemo(() => plans.data?.data ?? [], [plans.data]);
  // Sin plan elegido se toma el primero: la pantalla es por plan y arrancar
  // vacía obligaría a un clic antes de ver nada.
  const activePlanId = planId ?? planList[0]?.id;
  const activePlan = planList.find((plan) => plan.id === activePlanId);

  const prices = useBillingPricesQuery(activePlanId);

  if (plans.isPending) return <TableSkeleton rows={4} />;
  if (plans.isError) {
    return (
      <ProblemAlert
        error={plans.error}
        onRetry={() => void plans.refetch()}
        className="mx-auto max-w-xl"
      />
    );
  }

  if (planList.length === 0) {
    return (
      <EmptyState
        icon={Scale}
        accent="amber"
        title="No hay planes que tarifar"
        description="Crea primero un plan comercial; la tarifa cuelga de él."
      />
    );
  }

  const rows = prices.data?.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Tarifas</h1>
          <p className="text-muted-foreground text-sm">
            Histórico completo de vigencias por plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activePlanId ?? ""}
            onValueChange={(value) => setPlanId(value)}
          >
            <SelectTrigger className="w-[220px]" aria-label="Plan">
              <SelectValue placeholder="Elige un plan" />
            </SelectTrigger>
            <SelectContent>
              {planList.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} — {plan.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setPublishing(true)}>
            <Plus aria-hidden="true" />
            Publicar nueva tarifa
          </Button>
        </div>
      </header>

      {prices.isPending ? (
        <TableSkeleton rows={3} showHeader={false} />
      ) : prices.isError ? (
        <ProblemAlert error={prices.error} onRetry={() => void prices.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Scale}
          accent="amber"
          title={`${activePlan?.name ?? "Este plan"} no tiene tarifa`}
          description="Sin tarifa vigente el ciclo no puede emitirse: la emisión falla con billing/price_missing."
          action={
            <Button variant="outline" onClick={() => setPublishing(true)}>
              Publicar la primera tarifa
            </Button>
          }
        />
      ) : (
        <ol className="flex flex-col">
          {rows.map((price, index) => (
            <VigencyItem key={price.id} price={price} last={index === rows.length - 1} />
          ))}
        </ol>
      )}

      <PublishPriceSheet
        open={publishing}
        onOpenChange={setPublishing}
        planId={activePlanId}
        planName={activePlan?.name ?? ""}
        key={publishing ? activePlanId : "closed"}
      />
    </div>
  );
}

/** Un tramo de la línea de tiempo. El vigente lleva el punto coral. */
function VigencyItem({ price, last }: { price: BillingPrice; last: boolean }) {
  return (
    <li className="relative grid grid-cols-[12px_1fr] gap-x-4">
      {!last ? (
        <span
          aria-hidden="true"
          className="bg-border absolute top-4 bottom-0 left-[5px] w-[1.5px]"
        />
      ) : null}
      <span
        aria-hidden="true"
        className={
          price.is_current
            ? "bg-primary ring-primary/20 mt-[5px] size-[11px] rounded-full ring-4"
            : "bg-border mt-[5px] size-[11px] rounded-full"
        }
      />
      <div className={last ? "flex flex-col gap-1.5" : "flex flex-col gap-1.5 pb-6"}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight tabular-nums">
            {formatMoney(price.amount_cents, price.currency)}
          </span>
          <StatusBadge status={vigencyKey(price)} map={PRICE_VIGENCY_MAP} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {INTERVAL_LABELS[price.interval]} · desde {formatShortDate(price.effective_from)}
            {price.effective_to === null
              ? " · sin fin"
              : ` hasta ${formatShortDate(price.effective_to)}`}
          </span>
        </div>

        <Badge variant="outline" className="text-muted-foreground w-fit text-[10.5px]">
          {taxLabel(price.tax_treatment, price.tax_rate_bps)}
        </Badge>

        {price.overage_rates.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sin excedentes facturables</span>
        ) : (
          <ul className="mt-0.5 flex flex-wrap gap-1.5">
            {price.overage_rates.map((rate) => (
              <li
                key={rate.metric}
                className="border-border bg-secondary text-muted-foreground rounded-lg border px-2 py-1 text-[11px]"
              >
                {OVERAGE_METRIC_LABELS[rate.metric]} ·{" "}
                <b className="text-foreground font-medium tabular-nums">
                  {formatMoney(rate.amount_cents_per_unit, price.currency)}
                </b>{" "}
                {unitSizeLabel(rate)} · {includedLabel(rate)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
