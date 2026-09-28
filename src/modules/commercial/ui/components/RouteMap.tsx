"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { ArrowUp, CornerUpLeft, CornerUpRight, Flag, GitMerge, RotateCcw, Target, type LucideIcon } from "lucide-react";

import { formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import type { CommercialPaceDTO, CommercialPlanDTO, CommercialProposalDTO, KeyResultKey } from "@/modules/commercial/domain/commercial";
import { learningLine, LEARNING_PROPOSALS_MESSAGE, noProposalsMessage, paceHeadline, salesPerDay } from "@/modules/commercial/domain/copy";
import { formatMillions, formatPct, monthLabel, shortDay } from "@/modules/commercial/domain/format";
import { PACE_BADGES, PACE_PILL_TONES } from "@/modules/commercial/domain/labels";
import { dailyRateNeeded, displayStatus, expectedPct, gap, isLearning, progressPct, ratioPct } from "@/modules/commercial/domain/pace";
import { commercialProposalHref, expiryPhrase } from "@/modules/commercial/domain/proposals";
import { lastBusinessDay } from "@/modules/commercial/domain/route-figures";
import {
  NARROW_ROAD,
  pointAt,
  roadPath,
  roadSlice,
  routeOptions,
  sampleRoad,
  todaySteps,
  WIDE_ROAD,
  type RoadLayout,
  type RoadPoint,
  type RouteOption,
  type SampledRoad,
} from "@/modules/commercial/domain/route-map";
import { weekTicks } from "@/modules/commercial/domain/weeks";
import { useElementWidth } from "@/modules/commercial/ui/hooks/use-element-width";
import { CityScene } from "./CityScene";
import { StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

const WIDE = sampleRoad(WIDE_ROAD);
/** Desde este ancho (el `@4xl` del sistema, 56 rem) el panel y la llegada flotan sobre el mapa. */
export const WIDE_MIN_PX = 896;
const NARROW = sampleRoad(NARROW_ROAD);

/** La maniobra de cada indicación: el mismo icono para el mismo resultado. */
const STEP_ICONS: Record<KeyResultKey, LucideIcon> = {
  sales: ArrowUp,
  quotes: CornerUpRight,
  meetings: CornerUpLeft,
  contacted: GitMerge,
  leads: GitMerge,
  calls: CornerUpRight,
};

export interface RouteMapProps {
  pace: CommercialPaceDTO;
  plan: CommercialPlanDTO | null;
  /** «Meta del mes: $ X · la pusiste tú el …». */
  lead: string;
  canManage: boolean;
  /** `undefined` = cargando la primera vez. */
  proposals?: readonly CommercialProposalDTO[];
  proposalsError?: string | null;
  onRetryProposals?: () => void;
  canApprove: boolean;
  readOnlyMessage: string | null;
  onApprove?: (id: string) => Promise<void>;
}

/**
 * La ruta del mes como navegación (C3, canvas aprobado 2026-09-27): el mapa con
 * la carretera de la meta, el panel de navegación (la isla: destino, ritmo,
 * indicaciones de hoy y las rutas que prepara Axi) y la llegada estimada.
 *
 * El mapa es una carretera fija; lo que se mueve son las marcas, por fracción
 * de la meta: vas aquí (vendido), deberías ir (esperado a hoy), llegas
 * (proyección, o con la ruta elegida). Elegir una ruta la previsualiza y
 * «Tomar esta ruta» la aprueba por el mismo camino de siempre (abre el detalle).
 *
 * En ancho (≥ 896 px de tarjeta) el panel y la llegada flotan sobre el mapa; en
 * estrecho el mapa va arriba, solo, y debajo la llegada y el panel.
 */
export function RouteMap(props: RouteMapProps) {
  const { pace, plan, proposals } = props;
  const [selected, setSelected] = useState<string | null>(null);
  // Se monta UN trazado, el que cabe: el panel no se duplica para el lector de
  // pantalla ni para el teclado. Sin medida todavía (primer render), el ancho.
  const [boxRef, width] = useElementWidth<HTMLElement>();
  const wide = width === 0 || width >= WIDE_MIN_PX;
  const learning = isLearning(pace);
  const status = displayStatus(pace);
  const target = pace.target_revenue_cents;
  const achieved = status === "achieved";

  const options = useMemo(() => routeOptions(pace, plan, proposals ?? []), [pace, plan, proposals]);
  // Una ruta que ya no está (se aprobó o venció) deja de estar elegida.
  const route = options.find((option) => option.id === selected) ?? options[0];

  const done = achieved ? 1 : progressPct(pace.actual_revenue_cents, target) / 100;
  const expected = learning ? null : expectedPct(pace.business_days_elapsed, pace.business_days_total) / 100;
  const arrival = route.arrival;
  const last = lastBusinessDay(pace.period_start, pace.period_end, pace.weekdays) ?? pace.period_end;
  const weeks = weekTicks(pace.period_start, pace.period_end, pace.weekdays)
    .slice(0, -1)
    .map((week) => ({ label: week.label, at: week.end_pct / 100, money: formatMillions(Math.round((target * week.end_pct) / 100), pace.currency) }));

  const marks: MapMarks = {
    done,
    expected,
    arrival,
    behindMoney:
      expected === null || learning ? null : formatMillions(Math.abs(pace.expected_revenue_cents - pace.actual_revenue_cents), pace.currency),
    behind: pace.expected_revenue_cents > pace.actual_revenue_cents,
    actualMoney: formatMillions(pace.actual_revenue_cents, pace.currency),
    donePct: formatPct(progressPct(pace.actual_revenue_cents, target)),
    expectedMoney: formatMillions(pace.expected_revenue_cents, pace.currency),
    arrivalLabel: route.pct === null ? null : `${route.pct} · ${route.id === null ? "Si sigues así llegas a" : "Con esta ruta llegas a"} ${route.money?.replace("≈ ", "") ?? ""}`,
    goalLabel: `Meta · ${formatMoney(target, pace.currency)}`,
    goalDay: shortDay(last),
    startDay: shortDay(pace.period_start),
    weeks,
  };

  return (
    <section ref={boxRef} aria-label="La ruta del mes" className="@container/route">
      {wide ? (
        // Ancho: el mapa con el panel y la llegada encima (canvas 1).
        <div className="relative overflow-hidden rounded-[28px] border border-border" style={{ aspectRatio: `${String(WIDE_ROAD.width)} / ${String(WIDE_ROAD.height)}` }}>
          <MapLayer road={WIDE} marks={marks} variant="wide" />
          <div className="absolute inset-y-4 left-4 flex w-[23.5rem] flex-col">
            <NavigationPanel {...props} options={options} route={route} onSelect={setSelected} className="max-h-full" />
          </div>
          <ArrivalCard pace={pace} route={route} learning={learning} achieved={achieved} className="absolute right-4 bottom-4 w-80" />
          <Legend learning={learning} className="absolute top-4 right-4" />
        </div>
      ) : (
        // Estrecho: el mapa arriba y, debajo, la llegada y el panel (canvas 3).
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-[28px] border border-border" style={{ aspectRatio: `${String(NARROW_ROAD.width)} / ${String(NARROW_ROAD.height)}` }}>
            <MapLayer road={NARROW} marks={marks} variant="narrow" />
          </div>
          <ArrivalCard pace={pace} route={route} learning={learning} achieved={achieved} />
          <NavigationPanel {...props} options={options} route={route} onSelect={setSelected} />
        </div>
      )}
    </section>
  );
}

interface MapMarks {
  done: number;
  expected: number | null;
  arrival: number | null;
  behind: boolean;
  behindMoney: string | null;
  actualMoney: string;
  donePct: string;
  expectedMoney: string;
  arrivalLabel: string | null;
  goalLabel: string;
  goalDay: string;
  startDay: string;
  weeks: { label: string; at: number; money: string }[];
}

const pct = (value: number, of: number) => `${String((value / of) * 100)}%`;

/** Una etiqueta HTML clavada en un punto del mapa (en % de la caja: no escala con el SVG). */
function Pin({ at, layout, className, children, place }: { at: RoadPoint; layout: RoadLayout; className?: string; children: React.ReactNode; place: string }) {
  return (
    // `w-max`: cerca del borde derecho un absoluto se encoge al hueco que queda y partiría su texto.
    <span aria-hidden className={cn("absolute w-max", className)} style={{ left: pct(at.x, layout.width), top: pct(at.y, layout.height), transform: place }}>
      {children}
    </span>
  );
}

const CHIP = "inline-flex h-7 items-center gap-1.5 rounded-full bg-background px-2.5 text-xs font-medium whitespace-nowrap shadow-[0_4px_14px_-6px_rgba(16,16,24,.35)] ring-1 ring-border tabular-nums";

/**
 * El plano y la carretera. Tokens del tema (claro y oscuro): el plano en
 * `muted`, las manzanas en `secondary`, el borde de la carretera en el fondo.
 * La etiqueta accesible del SVG dice lo mismo que las marcas, con cifras.
 */
function MapLayer({ road, marks, variant }: { road: SampledRoad; marks: MapMarks; variant: "wide" | "narrow" }) {
  const uid = useId();
  const { layout } = road;
  const d = roadPath(layout);
  const you = pointAt(road, marks.done);
  const exp = marks.expected === null ? null : pointAt(road, marks.expected);
  const arr = marks.arrival === null ? null : pointAt(road, Math.min(1, marks.arrival));
  const goal = pointAt(road, 1);
  const start = pointAt(road, 0);
  const wide = variant === "wide";
  const stroke = wide ? 9 : 8;
  // Solo las semanas ya recorridas llevan etiqueta: las de delante caen junto a «vas aquí» y a la llegada.
  const pastWeeks = marks.weeks.filter((week) => week.at < marks.done - 0.06);
  const label = [
    `Ruta del mes: vas en ${marks.actualMoney}, el ${marks.donePct} del camino`,
    marks.expected === null ? null : `deberías ir en ${marks.expectedMoney}`,
    marks.arrivalLabel,
    `${marks.goalLabel}, ${marks.goalDay}`,
  ]
    .filter((part) => part !== null)
    .join("; ");

  return (
    <>
      <svg viewBox={`0 0 ${String(layout.width)} ${String(layout.height)}`} className="absolute inset-0 size-full" role="img" aria-label={label}>
        <defs>
          {/* La sombra de la carretera y el resplandor de lo recorrido: la ruta se despega del plano. */}
          <filter id={`${uid}-shadow`} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <filter id={`${uid}-glow`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <linearGradient id={`${uid}-done`} x1="0" x2="1" y1="1" y2="0">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="var(--color-brand-2)" />
          </linearGradient>
        </defs>
        <CityScene layout={layout} seed={wide ? 7 : 3} />
        <path d={d} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.14} strokeWidth={stroke * 3} strokeLinecap="round" filter={`url(#${uid}-shadow)`} transform="translate(0 6)" />
        <path d={d} fill="none" stroke="var(--color-background)" strokeWidth={stroke * 2} strokeLinecap="round" />
        <path d={d} fill="none" stroke="color-mix(in srgb, var(--color-foreground) 18%, var(--color-background))" strokeWidth={stroke} strokeLinecap="round" />
        <path d={d} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.5} strokeWidth={3} strokeDasharray="1 9" strokeLinecap="round" />
        {marks.arrival !== null ? (
          <polyline points={roadSlice(road, marks.done, Math.min(1, marks.arrival))} fill="none" stroke="var(--color-foreground)" strokeOpacity={0.85} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {marks.expected !== null && marks.expected > marks.done ? (
          <polyline points={roadSlice(road, marks.done, marks.expected)} fill="none" stroke="var(--color-warning)" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        <polyline points={roadSlice(road, 0, marks.done)} fill="none" stroke="var(--color-brand)" strokeOpacity={0.45} strokeWidth={stroke + 6} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${uid}-glow)`} />
        <polyline points={roadSlice(road, 0, marks.done)} fill="none" stroke={`url(#${uid}-done)`} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={start.x} cy={start.y} r={7} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={3} />
        {marks.weeks.map((week) => {
          const at = pointAt(road, week.at);
          return <circle key={week.label} cx={at.x} cy={at.y} r={5} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={2} />;
        })}
        {exp !== null ? <circle cx={exp.x} cy={exp.y} r={9} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={3} /> : null}
        {arr !== null && (marks.arrival ?? 0) < 1 ? (
          <circle cx={arr.x} cy={arr.y} r={10} fill="var(--color-background)" stroke="var(--color-foreground)" strokeWidth={2.5} strokeDasharray="3 3" />
        ) : null}
        <GoalPin at={goal} scale={wide ? 1 : 0.8} />
        {/* Tú: el disco de navegación con su pulso (sin movimiento si se pide menos animación). */}
        <circle cx={you.x} cy={you.y} r={wide ? 30 : 24} fill="var(--color-brand)" fillOpacity={0.16} />
        <circle
          cx={you.x}
          cy={you.y}
          r={wide ? 18 : 14}
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth={2}
          className="origin-center motion-safe:animate-ping"
          style={{ transformBox: "fill-box" }}
        />
        <circle cx={you.x} cy={you.y} r={wide ? 15 : 12} fill="var(--color-brand)" stroke="var(--color-background)" strokeWidth={4} />
        <path
          d={`M ${String(you.x)} ${String(you.y - 6)} L ${String(you.x + 5)} ${String(you.y + 5)} L ${String(you.x)} ${String(you.y + 2.5)} L ${String(you.x - 5)} ${String(you.y + 5)} Z`}
          fill="var(--color-background)"
        />
      </svg>

      {wide ? (
        <>
          <Pin at={start} layout={layout} place="translate(-30%, 16px)">
            <span className={CHIP}>
              <span className="size-1.5 rounded-full bg-foreground" />
              Salida · {marks.startDay}
            </span>
          </Pin>
          {pastWeeks.map((week, index) => (
            <Pin key={week.label} at={pointAt(road, week.at)} layout={layout} place={index % 2 === 0 ? "translate(calc(-100% - 14px), -50%)" : "translate(14px, -50%)"}>
              <span className={cn(CHIP, "h-6")}>
                <b className="font-semibold">{week.label}</b>
                <span className="text-muted-foreground">{week.money}</span>
              </span>
            </Pin>
          ))}
          <Pin at={you} layout={layout} place="translate(calc(-100% - 26px), -50%)">
            <span className="glass flex flex-col gap-0.5 rounded-2xl px-3.5 py-2.5">
              <span className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">Vas aquí</span>
              <span className="flex items-baseline gap-2">
                <b className="font-heading text-2xl leading-none font-bold whitespace-nowrap tabular-nums">{marks.actualMoney}</b>
                <span className="text-[13px] text-muted-foreground tabular-nums">{marks.donePct}</span>
              </span>
            </span>
          </Pin>
          {exp !== null ? (
            <Pin at={exp} layout={layout} place="translate(-50%, 18px)">
              <span className={CHIP}>
                <span className="size-2.5 rounded-full border-[2.5px] border-foreground" />
                Deberías ir en {marks.expectedMoney}
              </span>
            </Pin>
          ) : null}
          {exp !== null && marks.behindMoney !== null && marks.behind ? (
            <Pin at={pointAt(road, (marks.done + (marks.expected ?? marks.done)) / 2)} layout={layout} place="translate(20px, 40px)">
              <span className={cn(CHIP, "bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-background))]")}>
                <span className="size-1.5 rounded-full bg-warning" />
                Tramo lento · vas {marks.behindMoney} por debajo
              </span>
            </Pin>
          ) : null}
          {arr !== null && marks.arrivalLabel !== null && (marks.arrival ?? 0) < 1 ? (
            <Pin at={arr} layout={layout} place="translate(-50%, calc(-100% - 16px))">
              <span className={cn(CHIP, "bg-foreground text-background ring-0")}>{marks.arrivalLabel}</span>
            </Pin>
          ) : null}
          <Pin at={goal} layout={layout} place="translate(calc(-100% - 28px), calc(-50% - 34px))">
            <span className={cn(CHIP, "h-8 px-3.5")}>
              <b className="font-semibold">{marks.goalLabel}</b>
              <span className="text-muted-foreground">{marks.goalDay}</span>
            </span>
          </Pin>
        </>
      ) : (
        <>
          <Pin at={you} layout={layout} place="translate(calc(-100% - 20px), -50%)">
            <span className={cn(CHIP, "bg-foreground text-background ring-0")}>Vas aquí · {marks.actualMoney}</span>
          </Pin>
          <Pin at={goal} layout={layout} place="translate(calc(-100% - 22px), calc(-50% - 27px))">
            <span className={CHIP}>Meta · {marks.goalDay}</span>
          </Pin>
        </>
      )}
    </>
  );
}

/** La meta como pin de mapa: la gota en tinta con su bandera y la sombra en el suelo. */
export function GoalPin({ at, scale = 1 }: { at: RoadPoint; scale?: number }) {
  return (
    <g transform={`translate(${String(at.x)} ${String(at.y)}) scale(${String(scale)})`}>
      <ellipse cx={0} cy={2} rx={12} ry={4} fill="var(--color-foreground)" fillOpacity={0.18} />
      <path d="M 0 0 C -6 -10, -20 -18, -20 -34 A 20 20 0 1 1 20 -34 C 20 -18, 6 -10, 0 0 Z" fill="var(--color-foreground)" />
      <path d="M -6 -24 V -44 H 8 L 4.5 -39.5 L 8 -35 H -6" fill="none" stroke="var(--color-background)" strokeWidth={2.2} strokeLinejoin="round" />
    </g>
  );
}

function Legend({ learning, className }: { learning: boolean; className?: string }) {
  const items = [
    { key: "done", label: "Recorrido", swatch: "bg-brand" },
    ...(learning
      ? []
      : [
          { key: "slow", label: "Tramo lento", swatch: "bg-warning" },
          { key: "ahead", label: "Si sigues así", swatch: "bg-foreground" },
        ]),
  ];
  return (
    <div aria-hidden className={cn("glass flex h-11 items-center gap-3.5 rounded-full px-4 text-xs text-foreground/80", className)}>
      {items.map((item) => (
        <span key={item.key} className="inline-flex items-center gap-1.5">
          <span className={cn("h-1.5 w-4 rounded-full", item.swatch)} />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="w-4 border-t-2 border-dotted border-foreground" />
        Lo que falta
      </span>
    </div>
  );
}

/** La llegada estimada, como la hoja de un navegador. */
function ArrivalCard({ pace, route, learning, achieved, className }: { pace: CommercialPaceDTO; route: RouteOption; learning: boolean; achieved: boolean; className?: string }) {
  const target = pace.target_revenue_cents;
  const done = progressPct(pace.actual_revenue_cents, target);
  const sales = pace.key_results.find((kr) => kr.key === "sales");
  const missingSales = sales === undefined ? null : gap(sales.actual, sales.target).missing;
  const arrivalPct = route.arrival === null ? null : ratioPct(route.arrival * target, target);
  const extra = arrivalPct === null ? 0 : Math.max(0, Math.min(100, arrivalPct) - done);
  const last = lastBusinessDay(pace.period_start, pace.period_end, pace.weekdays) ?? pace.period_end;
  const shortfall = route.arrival === null ? null : Math.max(0, target - route.arrival * target);
  const note = achieved
    ? "Llegaste a la meta. Lo que venga ahora es camino extra."
    : learning
      ? learningLine(pace.business_days_elapsed)
      : route.id === null
        ? shortfall !== null && shortfall > 0
          ? `Al ritmo de hoy te quedas a ${formatMillions(shortfall, pace.currency)} de la meta. Cada ruta de Axi dice cuánto te acerca antes de aprobarla.`
          : "Al ritmo de hoy llegas a la meta."
        : `Con esta ruta la llegada sube a ${route.pct ?? ""}. Nada se envía sin tu aprobación.`;

  return (
    <div className={cn("glass-overlay flex min-w-0 flex-col gap-2.5 rounded-3xl px-5 py-4", className)}>
      <span className="text-xs text-muted-foreground">Llegada estimada · {shortDay(last)}</span>
      <p className="flex items-baseline gap-2.5">
        <b className="font-heading text-[44px] leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums">
          {achieved ? formatPct(ratioPct(pace.actual_revenue_cents, target)) : (route.pct ?? "—")}
        </b>
        <span className="text-[13px] text-muted-foreground">{learning && !achieved ? "sin proyección todavía" : "de la meta"}</span>
      </p>
      <span aria-hidden className="relative block h-2 overflow-hidden rounded-full bg-foreground/10">
        <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${String(done)}%` }} />
        <span className="absolute inset-y-0 bg-foreground/85" style={{ left: `${String(done)}%`, width: `${String(extra)}%` }} />
      </span>
      <span className="flex justify-between gap-3 text-[12.5px] text-muted-foreground tabular-nums">
        <span className="whitespace-nowrap">{route.money ?? formatMillions(pace.actual_revenue_cents, pace.currency)}</span>
        {missingSales !== null && missingSales > 0 ? <span className="whitespace-nowrap">{missingSales === 1 ? "falta 1 venta" : `faltan ${String(missingSales)} ventas`}</span> : null}
      </span>
      <span className="text-xs leading-relaxed text-pretty text-muted-foreground">{note}</span>
    </div>
  );
}

/**
 * El panel de navegación: LA isla de la pantalla. El destino, el ritmo, las
 * indicaciones de hoy y las rutas que prepara Axi (las acciones pendientes).
 */
function NavigationPanel({
  pace,
  plan,
  lead,
  canManage,
  proposals,
  proposalsError = null,
  onRetryProposals,
  canApprove,
  readOnlyMessage,
  onApprove,
  options,
  route,
  onSelect,
  className,
}: RouteMapProps & { options: RouteOption[]; route: RouteOption; onSelect: (id: string | null) => void; className?: string }) {
  const [busy, setBusy] = useState(false);
  const status = displayStatus(pace);
  const learning = isLearning(pace);
  const sales = pace.key_results.find((kr) => kr.key === "sales");
  const salesTarget = sales?.target ?? plan?.figures.needed_sales.value ?? 0;
  const headline = paceHeadline({
    status,
    currency: pace.currency,
    actual_cents: pace.actual_revenue_cents,
    target_cents: pace.target_revenue_cents,
    expected_cents: pace.expected_revenue_cents,
    projected_cents: pace.projected_revenue_cents,
    sales_actual: sales?.actual ?? 0,
    sales_target: salesTarget,
    days_left: pace.business_days_left,
    days_until_projection: pace.days_until_projection,
  });
  const perDay = salesPerDay(dailyRateNeeded(gap(sales?.actual ?? 0, salesTarget).missing, pace.business_days_left));
  const at = headline.indexOf(perDay);
  const steps = todaySteps(pace);
  const last = lastBusinessDay(pace.period_start, pace.period_end, pace.weekdays);
  const days = Math.max(0, pace.business_days_left);
  // En el panel caben la ruta actual y dos alternativas; el resto se ve en el detalle de cada una.
  const shown = options.slice(0, 3);
  const pending = options.length - 1;

  const take = async () => {
    if (route.id === null || onApprove === undefined) return;
    setBusy(true);
    try {
      await onApprove(route.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Navegación de la ruta" className={cn("glass-overlay axi-scroll flex min-w-0 flex-col gap-4 overflow-y-auto rounded-3xl p-4 @xl/route:p-5", className)}>
      <div className="flex items-center gap-3 rounded-2xl bg-background/80 p-3 ring-1 ring-border">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <Flag className="size-4" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[11px] text-muted-foreground">Destino · {monthLabel(pace.period_start)}</span>
          <b className="text-[15px] font-semibold tabular-nums">Vender {formatMoney(pace.target_revenue_cents, pace.currency)}</b>
          <span className="truncate text-xs text-muted-foreground" title={lead}>
            {lead.replace(/^Meta del mes: [^·]+· /, "")}
          </span>
        </span>
        {canManage ? (
          <Link href="/comercial/meta" aria-label="Cambiar meta" className="inline-flex min-h-6 items-center rounded-md text-[12.5px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Cambiar
          </Link>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <StatePill tone={PACE_PILL_TONES[status]}>{PACE_BADGES[status]?.label ?? status}</StatePill>
          <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {days === 0 ? "Hoy es el último día hábil" : `${String(days)} ${days === 1 ? "día hábil" : "días hábiles"}${last === null ? "" : ` · hasta el ${shortDay(last)}`}`}
          </span>
        </span>
        <p className="text-sm leading-snug text-pretty">
          {at === -1 ? (
            headline
          ) : (
            <>
              {headline.slice(0, at)}
              <b className="font-semibold whitespace-nowrap">{perDay}</b>
              {headline.slice(at + perDay.length)}
            </>
          )}
        </p>
      </div>

      {steps.length > 0 ? (
        <section aria-labelledby="route-today" className="flex flex-col">
          <h3 id="route-today" className="pb-1.5 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Indicaciones de hoy
          </h3>
          <ol className="flex flex-col">
            {steps.map((step) => {
              const Icon = STEP_ICONS[step.key];
              return (
                <li key={step.key} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 border-t border-border py-2">
                  <span aria-hidden className="flex size-9 items-center justify-center rounded-xl bg-foreground text-background">
                    <Icon className="size-4.5" strokeWidth={2.2} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-[14px] leading-tight font-semibold">{step.title}</b>
                    <span className="text-xs text-muted-foreground tabular-nums">{step.detail}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="route-options" className="mt-auto flex flex-col gap-2">
        <h3 id="route-options" className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          <Target aria-hidden className="size-4" strokeWidth={1.8} />
          Rutas · las prepara Axi
        </h3>
        {proposals === undefined ? (
          proposalsError !== null ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-[13px] text-muted-foreground">{proposalsError}</p>
              {onRetryProposals !== undefined ? (
                <Button variant="outline" size="sm" className="rounded-full" onClick={onRetryProposals}>
                  <RotateCcw aria-hidden className="size-4" />
                  Reintentar
                </Button>
              ) : null}
            </div>
          ) : (
            <div role="status" aria-label="Cargando las rutas" className="space-y-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          )
        ) : (
          <>
            <div role="radiogroup" aria-label="Rutas hacia la meta" className="flex flex-col gap-2">
              {shown.map((option) => (
                <RouteChoice key={option.id ?? "actual"} option={option} checked={option.id === route.id} onSelect={() => onSelect(option.id)} />
              ))}
            </div>
            {pending === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-muted-foreground">{learning ? LEARNING_PROPOSALS_MESSAGE : noProposalsMessage(pace.status)}</p>
            ) : null}
            {route.id !== null && route.proposal !== null ? (
              canApprove && onApprove !== undefined ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Button variant="contrast" className="h-11 w-full rounded-full" disabled={busy} aria-label={`Tomar esta ruta: ${route.title}`} onClick={() => void take()}>
                    Tomar esta ruta · aprobar
                  </Button>
                  <Link
                    href={commercialProposalHref(route.id)}
                    className="inline-flex min-h-6 items-center gap-1 rounded-md text-[12.5px] font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    Ver el detalle
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button asChild variant="outline" className="h-11 w-full rounded-full">
                    <Link href={commercialProposalHref(route.id)}>Ver el detalle</Link>
                  </Button>
                  {readOnlyMessage !== null ? <p className="text-[12.5px] text-muted-foreground">{readOnlyMessage}</p> : null}
                </div>
              )
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}

function RouteChoice({ option, checked, onSelect }: { option: RouteOption; checked: boolean; onSelect: () => void }) {
  const expiry = option.expiresAt === null ? null : expiryPhrase(option.expiresAt);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-3 rounded-2xl bg-background/85 px-3.5 py-3 text-left ring-1 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        checked ? "ring-2 ring-foreground" : "ring-border hover:ring-foreground/30",
      )}
    >
      <span aria-hidden className={cn("mt-0.5 flex size-[18px] items-center justify-center rounded-full border-[1.5px]", checked ? "border-foreground" : "border-muted-foreground")}>
        {checked ? <span className="size-2 rounded-full bg-foreground" /> : null}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        {/* Lo que aporta y cuándo vence: cada parte entera; si no caben, la segunda baja de línea. */}
        <span className="flex flex-wrap gap-x-1 text-[10.5px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          <span className="whitespace-nowrap">{option.kicker}</span>
          {expiry !== null ? <span className="whitespace-nowrap">· {expiry.toLowerCase()}</span> : null}
        </span>
        <b className="text-[13.5px] leading-snug font-semibold text-pretty">{option.title}</b>
      </span>
      <span className="flex flex-col items-end gap-0.5">
        <b className="font-heading text-xl leading-none font-bold whitespace-nowrap tabular-nums">{option.pct ?? "—"}</b>
        {option.money !== null ? <span className="text-[11.5px] whitespace-nowrap text-muted-foreground tabular-nums">{option.money.replace("≈ ", "")}</span> : null}
      </span>
    </button>
  );
}
