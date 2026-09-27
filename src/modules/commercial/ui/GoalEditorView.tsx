"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Flag, Lock, RotateCcw } from "lucide-react";

import { addMonthsToKey } from "@/core/lib/business-time";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import type { CommercialPlanDTO, FigureDTO, GoalInputDTO, PlanRateDTO } from "@/modules/commercial/domain/commercial";
import { GOAL_SAVED_DETAIL, GOAL_SAVED_TITLE, midMonthLine, MISSING_TICKET_FIGURE, reachableLine } from "@/modules/commercial/domain/copy";
import { formatInteger } from "@/core/lib/commercial-units";
import { formatMillions, formatPct, formatRate, monthLabel } from "@/modules/commercial/domain/format";
import { weekdaySpan } from "@/modules/commercial/domain/route-figures";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useMyCompany } from "@/modules/companies/public";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { InkIsland } from "@/shared/components/features/bento";
import { EmptyState } from "@/shared/components/features/empty-state";
import { PriceInput } from "@/shared/components/features/price-input";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CommercialBlockedState } from "./components/CommercialBlockedState";
import { SourceMark } from "./components/SourceMark";

type Preset = "last" | "plus10" | "plus25" | "custom";

const PRESETS: readonly { value: Preset; label: string; lift: number | null }[] = [
  { value: "last", label: "Como el mes pasado", lift: 0 },
  { value: "plus10", label: "+10 %", lift: 10 },
  { value: "plus25", label: "+25 %", lift: 25 },
  { value: "custom", label: "Otra cifra", lift: null },
];

const PREVIEW_DEBOUNCE_MS = 350;

/**
 * `/comercial/meta`: «¿Cuánto quieres vender en septiembre?». Una cifra
 * grande, atajos sobre el mes pasado y, debajo, «LO QUE IMPLICA»: la vista
 * previa del embudo al revés, debounced y con aborto (la cifra que el usuario
 * ya cambió no puede pisar a la nueva). Lo que se toque en «Ajustar supuestos»
 * pasa a decir «lo dijiste tú».
 *
 * Mismo gate que la ruta: sin `commercial:read` no hay pantalla; sin la
 * capacidad `crm` (o con el 403 del servidor) el bloqueado; error de red con
 * reintento; y sin `commercial:manage` no se pinta el formulario, que solo
 * produciría un 403 al guardar.
 */
export function GoalEditorView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  const { company } = useMyCompany();
  const goal = useCommercialStore((state) => state.goal);
  const blocker = useCommercialStore((state) => state.blocker);
  const pace = useCommercialStore((state) => state.pace);
  const preview = useCommercialStore((state) => state.preview);
  const saving = useCommercialStore((state) => state.saving);
  const load = useCommercialStore((state) => state.load);
  const saveGoal = useCommercialStore((state) => state.saveGoal);
  const previewPlan = useCommercialStore((state) => state.previewPlan);
  const cancelPreview = useCommercialStore((state) => state.cancelPreview);

  const canRead = hasPermission("commercial:read");
  const canManage = hasPermission("commercial:manage");
  const enabled = !loaded || hasCapability("crm");
  const current = goal.data?.goal ?? null;
  const seed = goal.data?.seed ?? null;
  const currency = current?.currency ?? company?.currency ?? "COP";
  const month = monthLabel(current?.period_start ?? pace.data?.today ?? monthKeyFallback());
  const lastMonth = seed?.last_month_revenue_cents ?? null;

  const [target, setTarget] = useState<number | null>(null);
  const [ticket, setTicket] = useState<number | null>(null);
  const [closeRate, setCloseRate] = useState<string>("");
  const [preset, setPreset] = useState<Preset>("custom");
  const [seeded, setSeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  useEffect(() => {
    if (enabled && canRead && goal.status === "idle") void load();
  }, [enabled, canRead, goal.status, load]);

  // La cifra inicial: la meta actual, si no la sugerida por la semilla.
  useEffect(() => {
    if (seeded || goal.data === null) return;
    setSeeded(true);
    setTarget(current?.target_revenue_cents ?? seed?.suggested_target_cents ?? null);
    setTicket(current?.declared_avg_ticket_cents ?? null);
    setCloseRate(current?.declared_close_rate_pct === null || current === null ? "" : String(current.declared_close_rate_pct));
  }, [seeded, goal.data, current, seed]);

  const input = useMemo<GoalInputDTO | null>(() => {
    if (target === null || target <= 0) return null;
    const rate = closeRate.trim() === "" ? null : Number(closeRate.replace(",", "."));
    return {
      target_revenue_cents: target,
      declared_avg_ticket_cents: ticket,
      declared_close_rate_pct: rate !== null && Number.isFinite(rate) && rate > 0 ? rate : null,
    };
  }, [target, ticket, closeRate]);

  useEffect(() => {
    if (input === null || !canManage) return;
    const timer = setTimeout(() => void previewPlan(input), PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input, canManage, previewPlan]);

  useEffect(() => () => cancelPreview(), [cancelPreview]);

  function choosePreset(next: Preset): void {
    setPreset(next);
    const lift = PRESETS.find((p) => p.value === next)?.lift ?? null;
    if (lift !== null && lastMonth !== null) setTarget(Math.round(lastMonth * (1 + lift / 100)));
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (input === null) {
      setError("Escribe cuánto quieres vender.");
      return;
    }
    setError(null);
    try {
      await saveGoal(input);
      showAlert({ tone: "success", title: GOAL_SAVED_TITLE, description: GOAL_SAVED_DETAIL });
      router.push("/comercial");
    } catch (err: unknown) {
      setError(errorMessage(err));
    }
  }

  if (!canRead) {
    return (
      <EmptyState icon={Lock} accent="muted" title="No tienes acceso a Comercial" description="Pídele a un administrador el permiso de lectura del módulo." />
    );
  }
  if (!enabled || blocker === "no_plan") return <CommercialBlockedState />;
  if (goal.data === null && goal.status === "error") {
    return (
      <EmptyState
        icon={RotateCcw}
        accent="muted"
        variant="solid"
        title="No pude cargar la meta"
        description={goal.error ?? undefined}
        action={
          <Button variant="outline" onClick={() => void load()}>
            Reintentar
          </Button>
        }
      />
    );
  }
  if (goal.data === null) {
    return (
      <div role="status" aria-label="Cargando" className="mx-auto max-w-[720px] space-y-5">
        <Skeleton className="h-9 w-3/4 rounded-lg" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <EmptyState
        icon={Lock}
        accent="muted"
        variant="solid"
        title="Solo un administrador puede cambiar la meta"
        description="Pídele a quien administra la cuenta que la fije o la cambie."
        action={
          <Button asChild variant="outline">
            <Link href="/comercial">Volver a la ruta</Link>
          </Button>
        }
      />
    );
  }

  const midMonth = current !== null && pace.data !== null && pace.data.actual_revenue_cents > 0;
  const periodKey = current?.period_start ?? pace.data?.today ?? monthKeyFallback();
  const lastMonthName = monthLabel(addMonthsToKey(periodKey, -1));
  const lift = target !== null && target > 0 && lastMonth !== null && lastMonth > 0 ? Math.round((target / lastMonth - 1) * 100) : null;

  return (
    <form onSubmit={(event) => void submit(event)} className="@container mx-auto w-full max-w-[1120px]">
      <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_24rem] @4xl:gap-7">
        <div className="flex min-w-0 flex-col gap-5">
          <Link
            href="/comercial"
            className="inline-flex min-h-6 w-fit items-center gap-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ChevronLeft aria-hidden className="size-4" />
            Volver a la ruta
          </Link>
          <header className="flex flex-col gap-2">
            <h1 className="font-heading text-[30px] leading-[1.05] font-bold tracking-[-0.025em] text-balance @xl:text-[44px]">
              {`¿Cuánto quieres vender en ${month}?`}
            </h1>
            {lastMonth !== null && seed !== null ? (
              <p className="text-sm text-muted-foreground tabular-nums">
                El mes pasado: <b className="font-medium whitespace-nowrap text-foreground">{formatMoney(lastMonth, currency)}</b>
                {seed.last_month_sales !== null ? <span className="whitespace-nowrap">{` · ${formatInteger(seed.last_month_sales)} ventas`}</span> : null}
                {seed.last_month_avg_ticket_cents !== null ? (
                  <span className="whitespace-nowrap">{` · ticket ${formatMoney(seed.last_month_avg_ticket_cents, currency)}`}</span>
                ) : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Una cifra, un mes. Te decimos qué implica.</p>
            )}
          </header>

          {midMonth && pace.data !== null ? (
            <Note>
              {midMonthLine({
                currency,
                actual_cents: pace.data.actual_revenue_cents,
                sales_actual: pace.data.key_results.find((kr) => kr.key === "sales")?.actual ?? 0,
                sales_target: pace.data.key_results.find((kr) => kr.key === "sales")?.target ?? 0,
                days_left: pace.data.business_days_left,
              })}
            </Note>
          ) : null}

          <section className="flex min-w-0 flex-col gap-4 rounded-3xl border border-border bg-card p-5 @xl:px-7 @xl:pt-6">
            <p aria-hidden className="text-xs text-muted-foreground">
              Meta del mes · {currency} · {month} {periodKey.slice(0, 4)}
            </p>
            <Label htmlFor="goal-target" className="sr-only">
              Meta del mes en {currency}
            </Label>
            {/* La cifra grande: se escribe en el propio número, con la raya de la meta debajo. */}
            <PriceInput
              id="goal-target"
              value={target}
              currency={currency}
              onChange={(cents) => {
                setTarget(cents);
                setPreset("custom");
              }}
              className="[&_input]:font-heading [&_input]:h-20 [&_input]:rounded-none [&_input]:border-0 [&_input]:border-b-2 [&_input]:border-foreground [&_input]:bg-transparent [&_input]:pl-10 [&_input]:text-[44px] [&_input]:font-extrabold [&_input]:tracking-[-0.04em] [&_input]:shadow-none [&_input]:focus-visible:ring-0 @xl:[&_input]:pl-12 @xl:[&_input]:text-[64px] [&>span]:left-0 [&>span]:text-3xl [&>span]:font-bold @xl:[&>span]:text-4xl"
            />
            {lastMonth !== null ? (
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <SegmentedControl
                  label="Atajos sobre el mes pasado"
                  size="sm"
                  surface="inline"
                  value={preset}
                  onValueChange={choosePreset}
                  items={PRESETS.map(({ value, label }) => ({ value, label }))}
                />
                {lift !== null ? (
                  <span className="text-[13px] whitespace-nowrap text-muted-foreground tabular-nums">
                    {lift >= 0 ? "+" : "−"}
                    {formatInteger(Math.abs(lift))} % sobre {lastMonthName}
                  </span>
                ) : null}
              </div>
            ) : null}
          </section>

          <ImpliesList
            preview={preview.data}
            loading={preview.status === "loading"}
            error={preview.status === "error" ? preview.error : null}
            target={target}
            currency={currency}
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4 @4xl:pt-11">
          <MonthIsland
            preview={preview.data}
            target={target}
            lastMonth={lastMonth}
            lastMonthName={lastMonthName}
            lift={lift}
            weekdays={pace.data?.weekdays ?? null}
            reachable={reachableLine(seed, currency)}
            currency={currency}
          />

          <details
            className="group rounded-3xl border border-border bg-card"
            open={assumptionsOpen}
            onToggle={(event) => setAssumptionsOpen(event.currentTarget.open)}
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between rounded-3xl px-5 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              Ajustar supuestos
              <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            {assumptionsOpen ? (
            <div className="grid gap-3 border-t border-border px-5 pt-4 pb-5">
              <div className="space-y-1.5">
                <Label htmlFor="goal-ticket">Ticket promedio</Label>
                <PriceInput id="goal-ticket" value={ticket} currency={currency} onChange={setTicket} placeholder="Como tu historia" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-close-rate">Cotización → venta (%)</Label>
                <Input
                  id="goal-close-rate"
                  inputMode="decimal"
                  value={closeRate}
                  placeholder="Como tu historia"
                  onChange={(event) => setCloseRate(event.target.value)}
                />
              </div>
            </div>
            ) : null}
          </details>
          <p className="px-1 text-xs leading-relaxed text-muted-foreground">
            Lo que cambies en «Ajustar supuestos» pasa a decir «lo dijiste tú». Cuando tu historia alcance muestra, te avisamos si conviene volver al dato real.
          </p>

          {error !== null ? <Note tone="danger">{error}</Note> : null}

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Button type="submit" size="lg" className="h-12 rounded-full" disabled={saving || input === null}>
              <Flag aria-hidden className="size-4" />
              Guardar meta
            </Button>
            <Button asChild type="button" variant="ghost" size="lg" className="h-12 rounded-full">
              <Link href="/comercial">Cancelar</Link>
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}

/** Solo para nombrar el mes en el título cuando aún no hay `today` del servidor. */
function monthKeyFallback(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Un aviso con el color en el punto, no en la caja (§10: el texto tintado no
 * pasa AA). `danger` es un error y se anuncia; `warn` pide atención; el resto informa.
 */
function Note({ tone = "info", children }: { tone?: "info" | "warn" | "danger"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      data-tone={tone}
      className="flex gap-2.5 rounded-2xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-foreground/85"
    >
      <span
        aria-hidden
        className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", tone === "danger" ? "bg-destructive" : tone === "warn" ? "bg-warning" : "bg-info")}
      />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function rateText(rate: PlanRateDTO | null, subject: string): string | null {
  if (rate === null) return null;
  return `${formatPct(rate.value * 100)} ${subject}`;
}

/** «$ 30.000.000 ÷ $ 700.000 de ticket = 42,9 → 43»: de dónde salen las ventas, con la cuenta a la vista. */
function salesMath(target: number, ticket: number, sales: number, currency: string): string {
  const raw = (target / ticket).toLocaleString("es-CO", { maximumFractionDigits: 1 });
  return `${formatMoney(target, currency)} ÷ ${formatMoney(ticket, currency)} de ticket = ${raw} → ${formatInteger(sales)}`;
}

/**
 * «LO QUE IMPLICA»: la lista viva del embudo al revés (canvas 2). UNA rejilla
 * para todas las filas: la columna de las cifras mide lo que mide la más larga
 * (`max-content`), así 7 o 70.000 no se salen ni desalinean; cada fila lleva
 * su tasa, de dónde sale y una barra proporcional a la cifra más alta (el
 * embudo se ve ensancharse). Las llamadas van aparte: salen en paralelo, no son
 * un eslabón más. Con el plan `incomplete` (falta el ticket) lo dice en vez de
 * inventarlo: el ticket jamás se supone (Q16).
 */
function ImpliesList({ preview, loading, error, target, currency }: { preview: CommercialPlanDTO | null; loading: boolean; error: string | null; target: number | null; currency: string }) {
  const niche = preview?.benchmark_niche_label ?? null;
  const incomplete = preview?.status === "incomplete";
  const ticket = preview?.inputs.avg_ticket_cents ?? null;
  const rows: Array<{ key: string; label: string; figure: FigureDTO | null; approx: boolean; rate: string | null; source: PlanRateDTO | null }> =
    preview === null
      ? []
      : [
          { key: "sales", label: "Ventas necesarias", figure: preview.figures.needed_sales, approx: false, rate: null, source: ticket },
          { key: "quotes", label: "Cotizaciones", figure: preview.figures.needed_quotes, approx: true, rate: rateText(preview.inputs.quote_to_sale, "de las cotizaciones se venden"), source: preview.inputs.quote_to_sale },
          { key: "meetings", label: "Citas agendadas", figure: preview.figures.needed_meetings, approx: true, rate: rateText(preview.inputs.meeting_to_sale, "de las citas terminan en venta"), source: preview.inputs.meeting_to_sale },
          { key: "contacted", label: "Contactados", figure: preview.figures.needed_contacted, approx: true, rate: rateText(preview.inputs.contact_to_quote, "de los contactados cotizan"), source: preview.inputs.contact_to_quote },
          { key: "leads", label: "Conversaciones nuevas", figure: preview.figures.needed_leads, approx: true, rate: rateText(preview.inputs.lead_to_contact, "de los que escriben se dejan contactar"), source: preview.inputs.lead_to_contact },
          { key: "calls", label: "Llamadas", figure: preview.figures.needed_calls, approx: true, rate: rateText(preview.inputs.call_answer, "contestan"), source: preview.inputs.call_answer },
        ];
  const shown = rows.filter((row) => row.figure !== null);
  const top = Math.max(1, ...shown.map((row) => row.figure?.value ?? 0));

  return (
    <section aria-labelledby="goal-implies" aria-busy={loading} className="@container/implies min-w-0 rounded-3xl border border-border bg-card px-5 pt-5 pb-2 @xl:px-7">
      <header className="flex flex-col gap-1 pb-3">
        <h2 id="goal-implies" className="font-heading text-xl font-bold tracking-[-0.01em]">
          Lo que implica
        </h2>
        <p className="text-[12.5px] text-muted-foreground">De la venta hacia atrás. Cada paso redondea hacia arriba.</p>
      </header>
      {target === null || target <= 0 ? (
        <p className="pb-4 text-[14px] text-muted-foreground">Escribe una cifra y te decimos cuántas ventas, citas y conversaciones hacen falta.</p>
      ) : preview === null && error !== null ? (
        <p className="pb-4 text-[14px] text-muted-foreground">{error}</p>
      ) : preview === null ? (
        <div className="space-y-3 pb-4" role="status" aria-label="Calculando">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
          {incomplete ? (
            <div className="pb-3">
              <Note tone="warn">Falta tu ticket promedio para trazar la ruta: escríbelo en «Ajustar supuestos». El ticket nunca se supone.</Note>
            </div>
          ) : null}
          {error !== null ? (
            <p className="pb-2 text-[12.5px] text-muted-foreground">No pude recalcular con la última cifra; lo de abajo es de la anterior. {error}</p>
          ) : null}
          <ul
            className={cn(
              "grid grid-cols-[max-content_minmax(0,1fr)] gap-x-5 transition-opacity @md/implies:grid-cols-[max-content_minmax(0,1fr)_8rem]",
              (loading || error !== null) && "opacity-60",
            )}
            aria-busy={loading}
          >
            {shown.map((row) => {
              const value = row.figure?.value ?? 0;
              return (
                <li
                  key={row.key}
                  className={cn(
                    "col-span-full grid grid-cols-subgrid items-center py-3.5",
                    row.key === "calls" ? "border-t border-foreground/15" : "border-t border-border",
                  )}
                >
                  {/* Sin ticket toda la cadena cuelga de él: un «0 · según tu historia» confunde. */}
                  <span className="text-right font-heading text-[22px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums @md/implies:text-[28px] @xl/implies:text-[30px]">
                    {incomplete ? "—" : `${row.approx ? "≈ " : ""}${formatInteger(value)}`}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[14.5px] font-medium">{row.label}</span>
                    {incomplete ? (
                      <>
                        <span className="text-[12.5px] text-muted-foreground">{MISSING_TICKET_FIGURE}</span>
                        {row.key !== "sales" && row.rate !== null ? <span className="text-[12.5px] text-muted-foreground">{row.rate}</span> : null}
                      </>
                    ) : (
                      <>
                        {row.key === "sales" && ticket !== null && target !== null ? (
                          <span className="font-mono text-[11.5px] break-words text-muted-foreground tabular-nums">{salesMath(target, ticket.value, value, currency)}</span>
                        ) : null}
                        {/* La tasa en su línea y la procedencia en la suya: en estrecho no quedan «·» sueltos. */}
                        {row.rate !== null ? <span className="text-[12.5px] text-muted-foreground">{row.rate}</span> : null}
                        <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">
                          <SourceMark source={row.figure?.source ?? "benchmark"} nicheLabel={niche} />
                          {row.source?.sample !== null && row.source?.sample !== undefined && row.source.window_days !== null ? (
                            <span>· {formatInteger(row.source.sample)} en {row.source.window_days} días</span>
                          ) : null}
                        </span>
                      </>
                    )}
                  </span>
                  <span aria-hidden className="hidden h-1.5 overflow-hidden rounded-full bg-muted @md/implies:block">
                    {incomplete ? null : (
                      <span
                        className={cn("block h-full rounded-full", row.key === "sales" ? "bg-brand" : "bg-foreground/80")}
                        style={{ width: `${String(Math.max(2, (value / top) * 100))}%` }}
                      />
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

/**
 * «Así queda tu mes» (canvas 2): la isla de la pantalla. Las ventas al día
 * hábil que pide la cifra, la meta contra el mes pasado, lo que toca por
 * semana y la meta que la historia hace alcanzable. Todo sale de la vista
 * previa y de la semilla; sin cifra o sin ticket lo dice en vez de inventar.
 */
function MonthIsland({
  preview,
  target,
  lastMonth,
  lastMonthName,
  lift,
  weekdays,
  reachable,
  currency,
}: {
  preview: CommercialPlanDTO | null;
  target: number | null;
  lastMonth: number | null;
  lastMonthName: string;
  lift: number | null;
  weekdays: readonly number[] | null;
  reachable: { amount: string; lift: string | null } | null;
  currency: string;
}) {
  const sales = preview !== null && preview.status !== "incomplete" ? preview.figures.needed_sales.value : null;
  const days = preview?.pacing.business_days_total ?? 0;
  const perDay = sales !== null && days > 0 ? sales / days : null;
  const perWeek = perDay !== null && weekdays !== null && weekdays.length > 0 ? Math.ceil(perDay * weekdays.length) : null;
  const span = weekdays === null ? null : weekdaySpan(weekdays);
  const barPct = target !== null && target > 0 && lastMonth !== null ? Math.min(100, (lastMonth / Math.max(target, lastMonth)) * 100) : null;

  return (
    <InkIsland label="Así queda tu mes" className="@container/month gap-5 p-6">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Así queda tu mes</p>
      {perDay === null ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {target === null || target <= 0
            ? "Escribe cuánto quieres vender y aquí verás cuántas ventas al día pide."
            : preview?.status === "incomplete"
              ? "Con tu ticket promedio te decimos cuántas ventas al día pide."
              : "Calculando…"}
        </p>
      ) : (
        <p className="flex flex-col gap-1.5">
          <span className="font-heading text-[52px] leading-[0.95] font-extrabold tracking-[-0.04em] whitespace-nowrap tabular-nums">
            {formatRate(perDay, 1)}
          </span>
          <span className="text-sm text-muted-foreground">{`ventas al día hábil, ${formatInteger(days)} días${span !== null ? ` ${span}` : ""}`}</span>
        </p>
      )}

      {barPct !== null && lastMonth !== null ? (
        <div className="flex flex-col gap-2">
          <span aria-hidden className="relative block h-2.5 rounded-full bg-foreground/10">
            <span className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${String(barPct)}%` }} />
            <span className="absolute -top-1.5 right-0 h-5 w-0.5 rounded-full bg-foreground" />
          </span>
          <span className="flex justify-between gap-3 text-xs text-muted-foreground tabular-nums">
            <span className="whitespace-nowrap">
              {lastMonthName} {formatMillions(lastMonth, currency)}
            </span>
            <span className="whitespace-nowrap">tu meta</span>
          </span>
        </div>
      ) : null}

      {lift !== null || perWeek !== null ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border">
          <div className="flex min-w-0 flex-col gap-1 bg-card/70 px-4 py-3.5">
            <dt className="text-[11.5px] text-muted-foreground">Sobre {lastMonthName}</dt>
            <dd className="font-heading text-xl font-bold whitespace-nowrap tabular-nums @sm/month:text-2xl">
              {lift === null ? "—" : `${lift >= 0 ? "+" : "−"}${formatInteger(Math.abs(lift))} %`}
            </dd>
          </div>
          <div className="flex min-w-0 flex-col gap-1 bg-card/70 px-4 py-3.5">
            <dt className="text-[11.5px] text-muted-foreground">Por semana</dt>
            <dd className="font-heading text-xl font-bold whitespace-nowrap tabular-nums @sm/month:text-2xl">
              {perWeek === null ? "—" : `${formatInteger(perWeek)} ${perWeek === 1 ? "venta" : "ventas"}`}
            </dd>
          </div>
        </dl>
      ) : null}

      {reachable !== null ? (
        <p className="text-[13px] leading-relaxed text-pretty text-muted-foreground">
          Con tu ritmo, <b className="font-semibold text-foreground tabular-nums">{reachable.amount}</b>
          {reachable.lift !== null ? ` (${reachable.lift})` : ""} es alcanzable. Más arriba también se puede: Axi te propondrá cómo acelerar.
        </p>
      ) : null}
    </InkIsland>
  );
}
