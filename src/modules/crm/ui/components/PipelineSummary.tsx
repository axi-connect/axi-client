"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import { formatMillions } from "@/core/lib/format";
import type {
  DealDTO,
  DealStatsDTO,
  DealStatsPeriod,
  PipelineStageDTO,
} from "@/modules/crm/domain/deal";
import {
  closeRate,
  coolingDeals,
  daysLabel,
} from "@/modules/crm/domain/pipeline-summary";
import {
  BentoFigure,
  BentoTile,
  InkIsland,
  Kicker,
} from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

export const PERIOD_LABELS: Record<DealStatsPeriod, string> = {
  today: "Hoy",
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
};

/**
 * El resumen del pipeline en bento (DESIGN-SYSTEM §9.5; lienzo CRM premium F1,
 * tablero 1): tres fichas —pronóstico, ganadas, tasa de cierre— y UNA isla
 * «Lo próximo» con las oportunidades que se enfrían.
 *
 * Por debajo de 66 rem de contenido el bento no cabe junto al tablero sin robarle alto: es una fila
 * que scrollea dentro de sí misma (con la barra de marca), nunca el body.
 */
const ITEM = "w-[15.5rem] shrink-0 snap-start @min-[66rem]:w-auto";

export function PipelineSummary({
  stats,
  period,
  deals,
  stages,
  boardLoaded,
  onOpenDeal,
}: {
  stats: DealStatsDTO | null;
  period: DealStatsPeriod;
  deals: readonly DealDTO[];
  stages: readonly PipelineStageDTO[];
  boardLoaded: boolean;
  onOpenDeal: (dealId: string) => void;
}) {
  const cooling = useMemo(() => coolingDeals(deals, stages), [deals, stages]);

  return (
    // `@container`: el bento se dimensiona por el ANCHO DEL CONTENIDO, no del
    // viewport (§9.5) — con el sidebar abierto, 1280 px de pantalla dejan ~976
    // útiles y cuatro columnas ahí cortaban la cifra. La rejilla entra desde
    // 66 rem de contenido (tres fichas de ~15 rem + la isla + los huecos).
    <div className="@container shrink-0">
      <section
        aria-label="Resumen del pipeline"
        className="sidebar-scroll -mx-4 flex snap-x gap-3 overflow-x-auto overscroll-x-contain scroll-px-4 px-4 pb-2 md:-mx-6 md:scroll-px-6 md:px-6 @min-[66rem]:mx-0 @min-[66rem]:grid @min-[66rem]:grid-cols-[repeat(3,minmax(0,1fr))_minmax(17rem,20rem)] @min-[66rem]:gap-4 @min-[66rem]:overflow-visible @min-[66rem]:px-0 @min-[66rem]:pb-0"
      >
        {stats === null ? (
          <>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className={`${ITEM} h-[140px] rounded-3xl`} />
            ))}
          </>
        ) : (
          <SummaryTiles stats={stats} period={period} />
        )}
        <CoolingIsland
          cooling={cooling}
          ready={boardLoaded}
          onOpenDeal={onOpenDeal}
        />
      </section>
    </div>
  );
}

function SummaryTiles({
  stats,
  period,
}: {
  stats: DealStatsDTO;
  period: DealStatsPeriod;
}) {
  const periodLabel = PERIOD_LABELS[period].toLowerCase();
  const rate = closeRate(stats);
  const weightedPct =
    stats.open_value_cents > 0
      ? Math.min(
          100,
          Math.round(
            (stats.weighted_forecast_cents / stats.open_value_cents) * 100,
          ),
        )
      : 0;

  return (
    <>
      <BentoTile label="Pronóstico ponderado" className={ITEM}>
        <BentoFigure
          value={formatMillions(stats.weighted_forecast_cents, stats.currency)}
          unit={`de ${formatMillions(stats.open_value_cents, stats.currency)}`}
        />
        <div
          aria-hidden="true"
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-foreground"
            style={{ width: `${weightedPct}%` }}
          />
        </div>
        <p className="text-xs text-pretty text-muted-foreground">
          Valor × probabilidad de cada etapa, en{" "}
          {stats.open_count === 1
            ? "1 abierta"
            : `${stats.open_count} abiertas`}
        </p>
      </BentoTile>

      <BentoTile label={`Ganadas · ${periodLabel}`} className={ITEM}>
        <BentoFigure
          value={String(stats.won_count)}
          unit={formatMillions(stats.won_value_cents, stats.currency)}
        />
        <p className="mt-auto text-xs text-pretty text-muted-foreground">
          {stats.avg_cycle_days === null
            ? "El ciclo medio aparece con la primera que ganes"
            : stats.avg_cycle_days < 1
              ? "Se ganan el mismo día en que se abren"
              : `Ciclo medio de ${daysLabel(stats.avg_cycle_days)}, de abrir a ganar`}
        </p>
      </BentoTile>

      <BentoTile label={`Tasa de cierre · ${periodLabel}`} className={ITEM}>
        {rate === null ? (
          <>
            <p className="font-heading text-2xl leading-tight font-bold">
              Aún sin cierres
            </p>
            <p className="mt-auto text-xs text-pretty text-muted-foreground">
              Aparece con la primera que ganes o pierdas.
            </p>
          </>
        ) : (
          <>
            <BentoFigure
              value={`${rate.pct} %`}
              unit={`${rate.won} de ${rate.closed} ${rate.closed === 1 ? "cerrada" : "cerradas"}`}
            />
            <p className="mt-auto text-xs text-pretty text-muted-foreground">
              {rate.closed < 5
                ? "Con tan pocos cierres la tasa aún no dice mucho"
                : `Ganas ${Math.round(rate.pct / 10)} de cada 10 que llegan a cerrarse`}
            </p>
          </>
        )}
      </BentoTile>
    </>
  );
}

function CoolingIsland({
  cooling,
  ready,
  onOpenDeal,
}: {
  cooling: ReturnType<typeof coolingDeals>;
  ready: boolean;
  onOpenDeal: (dealId: string) => void;
}) {
  // Mientras carga el tablero no se pinta ni «Todo en movimiento» ni la lista:
  // un hueco del mismo alto (§9.5, «la acción que decide no se pinta»).
  if (!ready)
    return (
      <Skeleton className="h-[140px] w-[18rem] shrink-0 snap-start rounded-3xl @min-[66rem]:w-auto" />
    );

  const first = cooling[0];
  const total = cooling.reduce(
    (sum, item) => sum + (item.deal.value_cents ?? 0),
    0,
  );
  const currency = first?.deal.currency ?? "COP";

  return (
    <InkIsland
      label="Lo próximo"
      className="w-[18rem] shrink-0 snap-start gap-2 p-5 @min-[66rem]:w-auto"
    >
      <Kicker>Lo próximo</Kicker>
      {first === undefined ? (
        <>
          <p className="font-heading text-xl leading-tight font-bold">
            Todo en movimiento
          </p>
          <p className="text-xs text-pretty text-muted-foreground">
            Ninguna oportunidad lleva más días de los que aguanta su etapa.
          </p>
        </>
      ) : (
        <>
          <p className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="font-heading text-xl leading-tight font-bold whitespace-nowrap">
              {cooling.length === 1
                ? "1 se enfría"
                : `${cooling.length} se enfrían`}
            </span>
            {total > 0 && (
              <span className="font-heading text-base font-bold whitespace-nowrap tabular-nums">
                {formatMillions(total, currency)}
              </span>
            )}
          </p>
          <p
            className="line-clamp-2 text-xs text-muted-foreground"
            title={first.deal.title}
          >
            La primera: {first.deal.contact.full_name ?? first.deal.title},{" "}
            {daysLabel(first.days)} en {first.stageName}.
          </p>
          <Button
            variant="contrast"
            size="sm"
            className="mt-1 w-fit rounded-full"
            onClick={() => onOpenDeal(first.deal.id)}
          >
            Ver la primera
            <ArrowRight aria-hidden="true" />
          </Button>
        </>
      )}
    </InkIsland>
  );
}
