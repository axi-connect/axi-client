"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatInteger } from "@/core/lib/commercial-units";
import { formatMoney } from "@/core/lib/format";
import type { CommercialPaceDTO, CommercialPlanDTO, PaceKeyResultDTO } from "@/modules/commercial/domain/commercial";
import { missingLine } from "@/modules/commercial/domain/copy";
import { formatMillions, formatPct, formatRate, monthLabel } from "@/modules/commercial/domain/format";
import {
  KR_FOOT_LINKS,
  KR_INPUTS,
  PLAN_INPUT_LABELS,
  projectedCount,
  unitOf,
  type KeyResultDetailKey,
  type PlanInputKey,
} from "@/modules/commercial/domain/key-result";
import { isOffPace, KR_LABELS, PACE_BADGES } from "@/modules/commercial/domain/labels";
import { gap, isLearning, ratioPct } from "@/modules/commercial/domain/pace";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Button } from "@/shared/components/ui/button";
import { PaceTrend } from "./PaceTrend";
import { SheetList, SheetRow } from "./SheetList";
import { SourceMark } from "./SourceMark";

export function keyResultTitle(key: KeyResultDetailKey): string {
  return key === "avg_ticket" ? "Ticket promedio" : KR_LABELS[key];
}

/**
 * El detalle de un resultado clave (vista 7 del mockup): la cifra grande, la
 * tendencia acumulada (solo ventas: es la única serie del contrato) y tres
 * listas —«El camino», «De dónde sale» y, solo en ventas, «Mix sugerido»—.
 * Cada tasa lleva su procedencia y, a quien puede, un «Corregir» que lleva al
 * editor de la meta (donde se declaran los supuestos).
 *
 * En «aprendiendo» no se afirma ritmo ni proyección: solo camino recorrido y
 * de dónde sale la meta de la fila.
 */
export function KeyResultDetail({
  detailKey,
  pace,
  plan,
  canManage,
}: {
  detailKey: KeyResultDetailKey;
  pace: CommercialPaceDTO;
  plan: CommercialPlanDTO | null;
  canManage: boolean;
}) {
  const learning = isLearning(pace);
  const kr = detailKey === "avg_ticket" ? null : (pace.key_results.find((row) => row.key === detailKey) ?? null);

  if (detailKey !== "avg_ticket" && kr === null) {
    return <p className="text-sm text-muted-foreground">Este resultado no está en tu ruta de este mes.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {kr !== null ? <BigFigure kr={kr} learning={learning} /> : <TicketFigure pace={pace} plan={plan} />}
      {detailKey === "sales" && !learning ? <PaceTrend pace={pace} /> : null}
      {kr !== null ? <PathList kr={kr} pace={pace} learning={learning} /> : null}
      <SourcesList detailKey={detailKey} pace={pace} plan={plan} canManage={canManage} />
      {detailKey === "sales" && plan !== null && plan.product_mix.length > 0 ? <MixList plan={plan} /> : null}
    </div>
  );
}

/**
 * El pie: cuántas acciones propuestas empujan este resultado (las pendientes
 * con `target_key_result` = la clave, del mismo store que «Axi propone») y
 * dónde se ve el dato con más detalle (CRM o Analítica, por href).
 */
export function KeyResultDetailFooter({ detailKey }: { detailKey: KeyResultDetailKey }) {
  const link = KR_FOOT_LINKS[detailKey];
  const pushing = useCommercialStore(
    (state) => state.proposals.data?.filter((row) => row.status === "pending" && row.target_key_result === detailKey).length ?? 0,
  );
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-[12.5px] text-accent-violet">
        {pushing === 0 ? null : pushing === 1 ? "1 acción propuesta empuja este resultado" : `${formatInteger(pushing)} acciones propuestas empujan este resultado`}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={link.href}>
          {link.label}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Button>
    </div>
  );
}

function BigFigure({ kr, learning }: { kr: PaceKeyResultDTO; learning: boolean }) {
  const [head, tail] = splitMissing(missingLine(kr.actual, kr.target));
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-heading text-[34px] leading-none tracking-tight tabular-nums">{head}</span>
      {tail !== null ? <span className="text-[15px] text-muted-foreground tabular-nums">{tail}</span> : null}
      {!learning && isOffPace(kr.status) ? <StatusBadge status={kr.status} map={PACE_BADGES} appearance="dot" className="self-center" /> : null}
    </p>
  );
}

/** «27 de 43 · faltan 16» → «27», «de 43 · faltan 16». */
function splitMissing(line: string): [string, string | null] {
  const index = line.indexOf(" ");
  return index === -1 ? [line, null] : [line.slice(0, index), line.slice(index + 1)];
}

function TicketFigure({ pace, plan }: { pace: CommercialPaceDTO; plan: CommercialPlanDTO | null }) {
  const planned = plan?.inputs.avg_ticket_cents ?? null;
  const actual = pace.avg_ticket_actual_cents;
  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-heading text-[34px] leading-none tracking-tight tabular-nums">
          {actual !== null ? formatMoney(actual, pace.currency) : "—"}
        </span>
        {planned !== null ? (
          <span className="text-[15px] text-muted-foreground tabular-nums">plan {formatMoney(planned.value, pace.currency)}</span>
        ) : null}
      </p>
      <SheetList title="El camino">
        <SheetRow
          label="Ticket real del mes"
          value={actual !== null ? formatMoney(actual, pace.currency) : "Aún sin ventas este mes"}
          secondary={
            pace.avg_ticket_sales_count !== null
              ? `sobre ${formatInteger(pace.avg_ticket_sales_count)} ${pace.avg_ticket_sales_count === 1 ? "venta" : "ventas"}`
              : undefined
          }
        />
        {actual !== null && planned !== null ? (
          <SheetRow label="Frente al plan" value={formatPct(ratioPct(actual, planned.value))} secondary="del ticket con el que se trazó la ruta" />
        ) : null}
      </SheetList>
    </div>
  );
}

function PathList({ kr, pace, learning }: { kr: PaceKeyResultDTO; pace: CommercialPaceDTO; learning: boolean }) {
  const elapsed = pace.business_days_elapsed;
  const total = pace.business_days_total;
  const left = pace.business_days_left;
  const { missing } = gap(kr.actual, kr.target);
  const projected = projectedCount(kr.actual, elapsed, total);
  const answered =
    kr.key === "calls" && kr.answered_actual !== null
      ? `Contestadas ${formatInteger(kr.answered_actual)}${kr.answered_expected !== null ? ` de ${formatInteger(kr.answered_expected)}` : ""}`
      : undefined;

  return (
    <SheetList title="El camino">
      <SheetRow
        label="Recorrido"
        value={`${formatInteger(kr.actual)} ${unitOf(kr.key, kr.actual)} · ${formatPct(ratioPct(kr.actual, kr.target))}`}
        secondary={answered}
      />
      {learning ? null : (
        <>
          <SheetRow
            label="Donde deberías ir hoy"
            value={formatInteger(kr.expected)}
            secondary={`${formatInteger(kr.target)} × ${formatInteger(elapsed)} de ${formatInteger(total)} días hábiles`}
          />
          <SheetRow label="Ritmo real" value={`${formatRate(kr.daily_rate_actual)} al día`} />
          <SheetRow
            label="Ritmo necesario"
            value={
              missing === 0
                ? "Ya llegaste"
                : left > 0
                  ? `${formatRate(missing / left, 1)} al día · ${formatInteger(left)} ${left === 1 ? "día hábil" : "días hábiles"}`
                  : `${formatInteger(missing)} ${unitOf(kr.key, missing)} hoy`
            }
            secondary={missing > 0 && left > 0 ? `${formatInteger(missing)} que faltan ÷ ${formatInteger(left)} días` : undefined}
          />
          {projected !== null ? (
            <SheetRow
              label="Proyección al cierre"
              value={`${formatInteger(projected)} ${unitOf(kr.key, projected)} · ${formatPct(ratioPct(projected, kr.target))}`}
              secondary={
                kr.key === "sales" && pace.projected_revenue_cents !== null
                  ? `${formatInteger(kr.actual)} ÷ ${formatInteger(elapsed)} × ${formatInteger(total)} días · ${formatMillions(pace.projected_revenue_cents, pace.currency)}`
                  : `${formatInteger(kr.actual)} ÷ ${formatInteger(elapsed)} × ${formatInteger(total)} días`
              }
            />
          ) : null}
        </>
      )}
    </SheetList>
  );
}

function SourcesList({
  detailKey,
  pace,
  plan,
  canManage,
}: {
  detailKey: KeyResultDetailKey;
  pace: CommercialPaceDTO;
  plan: CommercialPlanDTO | null;
  canManage: boolean;
}) {
  const niche = plan?.benchmark_niche_label ?? null;
  const rows = plan === null ? [] : KR_INPUTS[detailKey].flatMap((key) => inputRow(key, plan, pace.currency, niche, canManage));
  return (
    <SheetList title="De dónde sale">
      {rows}
      <SheetRow
        label="Días hábiles"
        value={`${formatInteger(pace.business_days_total)} en ${monthLabel(pace.period_start)}`}
        secondary="según tu horario de atención"
      />
    </SheetList>
  );
}

function inputRow(key: PlanInputKey, plan: CommercialPlanDTO, currency: string, niche: string | null, canManage: boolean) {
  const input = plan.inputs[key];
  if (input === null) return [];
  const value = key === "avg_ticket_cents" ? formatMoney(input.value, currency) : formatPct(input.value * 100);
  return [
    <SheetRow
      key={key}
      label={PLAN_INPUT_LABELS[key]}
      value={value}
      secondary={
        <>
          <SourceMark source={input.source} nicheLabel={niche} />
          {input.window_days !== null ? <span>· últimos {formatInteger(input.window_days)} días</span> : null}
          {input.sample !== null ? <span>· sobre {formatInteger(input.sample)}</span> : null}
        </>
      }
      action={
        canManage ? (
          <Button asChild variant="ghost" size="sm">
            <Link href="/comercial/meta" aria-label={`Corregir ${PLAN_INPUT_LABELS[key]}`}>
              Corregir
            </Link>
          </Button>
        ) : undefined
      }
    />,
  ];
}

function MixList({ plan }: { plan: CommercialPlanDTO }) {
  return (
    <SheetList title="Mix sugerido">
      {plan.product_mix.map((row) => (
        <SheetRow
          key={row.category}
          label={row.category}
          value={`${formatInteger(row.suggested_units)} ${row.suggested_units === 1 ? "venta" : "ventas"}`}
          secondary={`${formatPct(row.share_pct)} de tus ventas`}
        />
      ))}
    </SheetList>
  );
}
