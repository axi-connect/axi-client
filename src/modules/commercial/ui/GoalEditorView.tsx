"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Flag, Lock, RotateCcw, Route, TriangleAlert } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import type { CommercialPlanDTO, FigureDTO, GoalInputDTO, PlanRateDTO } from "@/modules/commercial/domain/commercial";
import { GOAL_SAVED_DETAIL, GOAL_SAVED_TITLE, midMonthLine, MISSING_TICKET_FIGURE } from "@/modules/commercial/domain/copy";
import { formatInteger } from "@/core/lib/commercial-units";
import { formatPct, monthLabel } from "@/modules/commercial/domain/format";
import { useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { useMyCompany } from "@/modules/companies/public";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { PriceInput } from "@/shared/components/features/price-input";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
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

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto max-w-[720px] space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">¿Cuánto quieres vender en {month}?</h1>
        {lastMonth !== null && seed !== null ? (
          <p className="mt-1 text-sm text-muted-foreground">
            El mes pasado: <b className="font-medium text-foreground tabular-nums">{formatMoney(lastMonth, currency)}</b>
            {seed.last_month_sales !== null ? ` · ${formatInteger(seed.last_month_sales)} ventas` : ""}
            {seed.last_month_avg_ticket_cents !== null ? ` · ticket ${formatMoney(seed.last_month_avg_ticket_cents, currency)}` : ""}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Una cifra, un mes. Te decimos qué implica.</p>
        )}
      </header>

      {midMonth && pace.data !== null ? (
        <Callout tone="info" icon={Route} className="text-[13px]">
          {midMonthLine({
            currency,
            actual_cents: pace.data.actual_revenue_cents,
            sales_actual: pace.data.key_results.find((kr) => kr.key === "sales")?.actual ?? 0,
            sales_target: pace.data.key_results.find((kr) => kr.key === "sales")?.target ?? 0,
            days_left: pace.data.business_days_left,
          })}
        </Callout>
      ) : null}

      <div>
        <Label htmlFor="goal-target" className="sr-only">
          Meta del mes en {currency}
        </Label>
        <PriceInput
          id="goal-target"
          value={target}
          currency={currency}
          onChange={(cents) => {
            setTarget(cents);
            setPreset("custom");
          }}
          className="[&_input]:font-heading [&_input]:h-16 [&_input]:rounded-xl [&_input]:pl-9 [&_input]:text-[30px] [&_input]:tracking-[-0.02em] [&>span]:left-4 [&>span]:text-lg"
        />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {currency} · {month}
        </p>
      </div>

      {lastMonth !== null ? (
        <SegmentedControl
          label="Atajos sobre el mes pasado"
          size="sm"
          surface="inline"
          value={preset}
          onValueChange={choosePreset}
          items={PRESETS.map(({ value, label }) => ({ value, label }))}
        />
      ) : null}

      <ImpliesList preview={preview.data} loading={preview.status === "loading"} error={preview.status === "error" ? preview.error : null} target={target} currency={currency} />

      <details className="group rounded-2xl border border-border">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
          Ajustar supuestos
          <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-3 border-t border-border/60 px-4 pt-3 pb-4 sm:grid-cols-2">
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
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Lo que cambies aquí pasa a decir «lo dijiste tú». Cuando tu historia alcance muestra, te avisamos si conviene volver al dato real.
          </p>
        </div>
      </details>

      {error !== null ? (
        <Callout tone="danger" icon={TriangleAlert}>
          {error}
        </Callout>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving || input === null}>
          <Flag aria-hidden className="size-4" />
          Guardar meta
        </Button>
        <Button asChild type="button" variant="ghost">
          <Link href="/comercial">Cancelar</Link>
        </Button>
      </div>
    </form>
  );
}

/** Solo para nombrar el mes en el título cuando aún no hay `today` del servidor. */
function monthKeyFallback(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function rateText(rate: PlanRateDTO | null, subject: string): string | null {
  if (rate === null) return null;
  return `${formatPct(rate.value * 100)} ${subject}`;
}

/**
 * «LO QUE IMPLICA»: la lista viva del embudo al revés. Cada fila lleva su
 * cifra, la tasa que la produce y de dónde sale. Con el plan `incomplete`
 * (falta el ticket) lo dice en vez de inventarlo: el ticket jamás se supone.
 */
function ImpliesList({ preview, loading, error, target, currency }: { preview: CommercialPlanDTO | null; loading: boolean; error: string | null; target: number | null; currency: string }) {
  const niche = preview?.benchmark_niche_label ?? null;
  const incomplete = preview?.status === "incomplete";
  const rows: Array<{ key: string; label: string; figure: FigureDTO | null; approx: boolean; rate: string | null; source: PlanRateDTO | null }> =
    preview === null
      ? []
      : [
          {
            key: "sales",
            label: "Ventas necesarias",
            figure: preview.figures.needed_sales,
            approx: false,
            rate: preview.inputs.avg_ticket_cents === null ? null : `ticket ${formatMoney(preview.inputs.avg_ticket_cents.value, currency)}`,
            source: preview.inputs.avg_ticket_cents,
          },
          { key: "quotes", label: "Cotizaciones", figure: preview.figures.needed_quotes, approx: true, rate: rateText(preview.inputs.quote_to_sale, "de las cotizaciones se venden"), source: preview.inputs.quote_to_sale },
          { key: "meetings", label: "Citas agendadas", figure: preview.figures.needed_meetings, approx: true, rate: rateText(preview.inputs.meeting_to_sale, "de las citas terminan en venta"), source: preview.inputs.meeting_to_sale },
          { key: "contacted", label: "Contactados", figure: preview.figures.needed_contacted, approx: true, rate: rateText(preview.inputs.contact_to_quote, "de los contactados cotizan"), source: preview.inputs.contact_to_quote },
          { key: "leads", label: "Conversaciones nuevas", figure: preview.figures.needed_leads, approx: true, rate: rateText(preview.inputs.lead_to_contact, "de los que escriben se dejan contactar"), source: preview.inputs.lead_to_contact },
          { key: "calls", label: "Llamadas", figure: preview.figures.needed_calls, approx: true, rate: rateText(preview.inputs.call_answer, "contestan"), source: preview.inputs.call_answer },
        ];

  return (
    <section aria-labelledby="goal-implies" aria-busy={loading} className="overflow-hidden rounded-2xl border border-border bg-background shadow-float">
      <h2 id="goal-implies" className="px-4 pt-3.5 pb-1 text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Lo que implica
      </h2>
      {target === null || target <= 0 ? (
        <p className="px-4 pt-2 pb-4 text-[14px] text-muted-foreground">Escribe una cifra y te decimos cuántas ventas, citas y conversaciones hacen falta.</p>
      ) : preview === null && error !== null ? (
        <p className="px-4 pt-2 pb-4 text-[14px] text-muted-foreground">{error}</p>
      ) : preview === null ? (
        <div className="space-y-3 px-4 pt-2 pb-4" role="status" aria-label="Calculando">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-10 w-full" />
          ))}
        </div>
      ) : (
        <>
          {incomplete ? (
            <div className="px-4 pt-2 pb-1">
              <Callout tone="warn" icon={TriangleAlert}>
                Falta tu ticket promedio para trazar la ruta: escríbelo en «Ajustar supuestos». El ticket nunca se supone.
              </Callout>
            </div>
          ) : null}
          {error !== null ? (
            <p className="px-4 pt-2 text-[12.5px] text-muted-foreground">
              No pude recalcular con la última cifra; lo de abajo es de la anterior. {error}
            </p>
          ) : null}
          <ul className={`grouped-list rounded-none transition-opacity ${loading || error !== null ? "opacity-60" : ""}`} aria-busy={loading}>
            {rows
              .filter((row) => row.figure !== null)
              .map((row) =>
                // Sin ticket toda la cadena cuelga de él: un «0 · según tu
                // historia» confunde. Se dice qué falta y se deja la tasa (Q16).
                incomplete ? (
                  <li key={row.key} className="grouped-row grid grid-cols-[minmax(0,1fr)] gap-y-px px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{row.label}</span>
                    <span className="text-[15px] font-medium text-muted-foreground">{MISSING_TICKET_FIGURE}</span>
                    {row.key !== "sales" && row.rate !== null ? <span className="text-[12.5px] text-muted-foreground">{row.rate}</span> : null}
                  </li>
                ) : (
                  <li key={row.key} className="grouped-row grid grid-cols-[minmax(0,1fr)] gap-y-px px-4 py-3">
                    <span className="text-[12px] text-muted-foreground">{row.label}</span>
                    <span className="text-[15px] font-medium tabular-nums">
                      {row.approx ? "≈ " : ""}
                      {formatInteger(row.figure?.value ?? 0)}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">
                      {row.rate !== null ? <span>{row.rate}</span> : null}
                      {row.rate !== null ? <span aria-hidden>·</span> : null}
                      <SourceMark source={row.figure?.source ?? "benchmark"} nicheLabel={niche} />
                      {row.source?.sample !== null && row.source?.sample !== undefined && row.source.window_days !== null ? (
                        <span>· {formatInteger(row.source.sample)} en {row.source.window_days} días</span>
                      ) : null}
                    </span>
                  </li>
                ),
              )}
          </ul>
        </>
      )}
    </section>
  );
}
