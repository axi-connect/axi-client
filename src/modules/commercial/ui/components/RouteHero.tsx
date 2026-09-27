"use client";

import { formatMoney } from "@/core/lib/format";
import type { CommercialPaceDTO, CommercialPlanDTO } from "@/modules/commercial/domain/commercial";
import { learningLine, paceHeadline, salesPerDay } from "@/modules/commercial/domain/copy";
import { formatMillions, formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { PACE_BADGES, PACE_PILL_TONES } from "@/modules/commercial/domain/labels";
import { dailyRateNeeded, displayStatus, expectedPct, gap, isLearning, progressPct } from "@/modules/commercial/domain/pace";
import { routeFigures, todayMark, type RouteFigure } from "@/modules/commercial/domain/route-figures";
import { weekTicks } from "@/modules/commercial/domain/weeks";
import { useEntrance } from "@/modules/commercial/ui/hooks/use-entrance";
import { StatePill } from "@/shared/components/features/bento";
import { CountUpValue } from "@/shared/components/features/count-up";
import { RouteLine } from "./RouteLine";


/**
 * El instrumento de la ruta del mes (canvas 1): lo vendido, UNA frase, la
 * línea y la franja de cuatro cifras. Sin brillos ni rayados: la cifra y la
 * línea hablan solas.
 *
 * En «aprendiendo» (`displayStatus` = `insufficient_data`) la línea va sin
 * marca de hoy ni proyección, la franja solo dice Faltan y Quedan, y el aviso
 * de los dos hitos del método ocupa el resto. Una meta cumplida gana sobre
 * eso. Un solo motor de entrada (`useEntrance`) mueve la cifra y la línea.
 *
 * Desbordes: la cifra grande baja de tamaño con el ancho de la tarjeta
 * (container queries) y «de $ meta» salta de línea antes que salirse; las
 * cifras de la franja no se parten (`whitespace-nowrap`) y la franja pasa a dos
 * columnas en estrecho.
 */
export function RouteHero({ pace, plan }: { pace: CommercialPaceDTO; plan: CommercialPlanDTO | null }) {
  const t = useEntrance();
  const status = displayStatus(pace);
  const learning = isLearning(pace);
  const target = pace.target_revenue_cents;
  const done = progressPct(pace.actual_revenue_cents, target);
  const expected = learning ? null : expectedPct(pace.business_days_elapsed, pace.business_days_total) / 100;
  const projected =
    learning || pace.projected_revenue_cents === null || target <= 0 ? null : pace.projected_revenue_cents / target;
  const sales = pace.key_results.find((kr) => kr.key === "sales");
  const salesTarget = sales?.target ?? plan?.figures.needed_sales.value ?? 0;
  const projectionFigure =
    projected === null || pace.projected_revenue_cents === null
      ? null
      : `${formatMillions(pace.projected_revenue_cents, pace.currency)} · ${formatPct(projected * 100)}`;

  const headline = paceHeadline({
    status,
    currency: pace.currency,
    actual_cents: pace.actual_revenue_cents,
    target_cents: target,
    expected_cents: pace.expected_revenue_cents,
    projected_cents: pace.projected_revenue_cents,
    sales_actual: sales?.actual ?? 0,
    sales_target: salesTarget,
    days_left: pace.business_days_left,
    days_until_projection: pace.days_until_projection,
  });
  // Lo que hay que HACER va en negrita dentro de la frase («3 ventas al día»).
  const perDay = salesPerDay(dailyRateNeeded(gap(sales?.actual ?? 0, salesTarget).missing, pace.business_days_left));
  const figures = routeFigures(pace);

  return (
    <section aria-label="La ruta del mes" className="@container overflow-hidden rounded-3xl border border-border bg-card">
      <div className="flex flex-col px-5 pt-5 @xl:px-8 @xl:pt-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sans text-xs font-normal text-muted-foreground">Vendido en {monthLabel(pace.period_start)}</h2>
          <StatePill tone={PACE_PILL_TONES[status]}>{PACE_BADGES[status]?.label ?? status}</StatePill>
        </div>

        <div className="mt-2.5 flex items-end justify-between gap-6">
          <p className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <CountUpValue
              value={pace.actual_revenue_cents}
              progress={t}
              format={(cents) => formatMillions(Math.round(cents), pace.currency)}
              className="font-heading text-[40px] leading-[0.95] font-bold tracking-[-0.04em] whitespace-nowrap tabular-nums @xl:text-[56px] @4xl:text-[72px]"
            />
            <span className="text-[15px] whitespace-nowrap text-muted-foreground tabular-nums @xl:text-base">
              de {formatMoney(target, pace.currency)}
            </span>
          </p>
          <p className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="font-heading text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums @xl:text-[40px]">
              {formatPct(done)}
            </span>
            <span className="text-xs whitespace-nowrap text-muted-foreground">del camino</span>
          </p>
        </div>

        <p className="mt-4 max-w-[48rem] text-[15px] leading-[1.45] text-pretty text-foreground/80 @xl:text-[17px]">
          <Emphasis text={headline} strong={perDay} />
        </p>

        <RouteLine
          className="mt-4"
          done={done / 100}
          expected={expected}
          projected={projected}
          todayLabel={learning ? null : todayMark(pace.today)}
          targetLabel={`Meta · ${formatMillions(target, pace.currency)}`}
          figures={{
            actual: formatMillions(pace.actual_revenue_cents, pace.currency),
            target: formatMoney(target, pace.currency),
            projected: projectionFigure,
          }}
          weeks={weekTicks(pace.period_start, pace.period_end, pace.weekdays)}
          progress={t}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 border-t border-border bg-muted/40 @4xl:grid-cols-4">
        {figures.map((figure, index) => (
          <Figure key={figure.key} figure={figure} index={index} />
        ))}
        {learning ? (
          <p className="col-span-2 flex gap-2 border-t border-border px-4 py-4 text-[13px] leading-relaxed text-muted-foreground @xl:px-8 @4xl:border-t-0 @4xl:border-l @4xl:px-6">
            <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-muted-foreground" />
            {/* La frase de arriba ya dice «Estamos aprendiendo tu ritmo»: aquí, los dos hitos. */}
            <span>{learningLine(pace.business_days_elapsed)}</span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Una cifra de la franja. La leyenda de «hoy» y de la proyección repite el dibujo de la línea. */
function Figure({ figure, index }: { figure: RouteFigure; index: number }) {
  return (
    <dl
      className={
        // Dos columnas en estrecho (filete entre ellas y entre filas), cuatro en ancho.
        "flex min-w-0 flex-col gap-1 px-4 py-4 @xl:px-8 @4xl:px-6 @4xl:first:pl-8 " +
        (index % 2 === 1 ? "border-l border-border " : "") +
        (index >= 2 ? "border-t border-border @4xl:border-t-0 @4xl:border-l " : "")
      }
    >
      <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        {figure.key === "expected" ? <span aria-hidden className="block h-3 w-0.5 rounded-full bg-foreground" /> : null}
        {figure.key === "projection" ? (
          <svg aria-hidden width="22" height="8" viewBox="0 0 22 8" className="shrink-0">
            <line x1="1" x2="15" y1="4" y2="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="1.5 4" strokeLinecap="round" className="text-foreground" />
            <circle cx="18" cy="4" r="3" fill="var(--color-background)" stroke="currentColor" strokeWidth="1.4" className="text-foreground" />
          </svg>
        ) : null}
        {figure.label}
      </dt>
      <dd className="font-heading text-xl leading-tight font-semibold tracking-[-0.02em] whitespace-nowrap tabular-nums @xl:text-2xl">
        {figure.value}
      </dd>
      {figure.detail !== null ? <dd className="text-[12.5px] text-pretty text-muted-foreground tabular-nums">{figure.detail}</dd> : null}
    </dl>
  );
}

/** La frase con su parte accionable en negrita; si la parte no está, la frase tal cual. */
function Emphasis({ text, strong }: { text: string; strong: string }) {
  const at = text.indexOf(strong);
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <b className="font-semibold whitespace-nowrap text-foreground">{strong}</b>
      {text.slice(at + strong.length)}
    </>
  );
}
