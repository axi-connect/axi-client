"use client";

/**
 * Tarifas (`/platform/billing/prices`): el catálogo de dos ejes.
 *
 * El precio tiene dos ejes: el paquete vende funciones y el tramo vende
 * conversaciones (`celda = paquete + tramo`, G7). El servidor GUARDA celdas
 * —una fila por plan, tramo, intervalo y vigencia— pero aquí se EDITAN los
 * nueve componentes y la rejilla se deriva en vivo. Publicar manda las 36
 * celdas en UNA transacción: la landing nunca ve medio catálogo nuevo.
 *
 * **Una tarifa se SUCEDE, no se edita**: publicar cierra la vigencia anterior
 * y crea filas nuevas. La línea de tiempo de vigencias por plan explica por qué
 * una factura de junio dice otro importe.
 *
 * El margen no se calcula aquí: llega con la consola de margen (Tanda C) y se
 * muestra como «pendiente» en la verja. Inventarlo con constantes en el
 * cliente sería repetir el error del `margin_multiplier`.
 */
import { useEffect, useMemo, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { TableSkeleton } from "@/shared/components/features/loading";
import { StatusBadge } from "@/shared/components/features/status-badge/StatusBadge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SegmentedControl } from "@/shared/components/ui/segmented";
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
  type BillingPromotion,
} from "../../../domain/billing";
import {
  ANNUAL_MONTHS_BILLED,
  deriveCells,
  discountedCents,
  overrideKey,
  runGate,
  type CellOverride,
  type GateCheck,
  type PackageComponent,
  type TierComponent,
} from "../../../domain/pricing-cells";
import {
  useAllBillingPricesQuery,
  usePricingPreviewQuery,
  usePromotionsQuery,
  usePublishPriceBatch,
  useVolumeTiersQuery,
} from "../../../infrastructure/api/hooks/use-catalog";
import { useMarginCellsQuery } from "../../../infrastructure/api/hooks/use-margin";
import { usePlansQuery } from "../../../infrastructure/api/hooks/use-plans";
import {
  BASIS_LABELS,
  GATE_CHECK_LABELS,
  SCOPE_LABELS,
  STATUS_CLASSES,
  cellStatus,
  formatPct,
  summarizeCells,
  type MarginCell,
  type MarginGateReport,
} from "../../../domain/margin";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { PublishPriceSheet } from "./PublishPriceSheet";

type Interval = "monthly" | "annual";
/** Un fallo de verja tal como viaja en `details.failures` del 409 o en el informe. */
type GateFailureLike = { check: string; detail: string };
type Mode = "list" | "promo";

/** Colores de serie por paquete: coral, violeta e «ink». Identidad también por etiqueta directa. */
const SERIES = ["stroke-brand fill-brand", "stroke-accent-violet fill-accent-violet", "stroke-foreground fill-foreground"];
const SERIES_TEXT = ["text-brand", "text-accent-violet", "text-foreground"];
const SERIES_BG = ["bg-brand", "bg-accent-violet", "bg-foreground"];

export function PricesView() {
  const plans = usePlansQuery();
  const tiers = useVolumeTiersQuery();
  const prices = useAllBillingPricesQuery();
  const promotions = usePromotionsQuery();
  // La tarifa de PAQUETE vive en el servidor (billing_plan_fee) y viaja en el
  // catálogo público por slug: es el componente, no una inferencia desde celdas.
  const preview = usePricingPreviewQuery();

  const failed = [plans, tiers, prices, preview].find((query) => query.isError);
  if (failed?.isError) {
    return <ProblemAlert error={failed.error} onRetry={() => void failed.refetch()} className="mx-auto max-w-xl" />;
  }
  if (plans.data === undefined || tiers.data === undefined || prices.data === undefined || preview.data === undefined) {
    return <TableSkeleton rows={6} />;
  }

  return (
    <CatalogEditor
      plans={plans.data.data}
      tiers={tiers.data.data}
      prices={prices.data.data}
      packageFeeBySlug={Object.fromEntries(
        preview.data.packages.map((plan) => [plan.public_slug, plan.package_fee_cents] as const),
      )}
      promotion={promotions.data?.data.find((promo) => promo.is_active && promo.is_public) ?? null}
    />
  );
}

type PlanRow = ReturnType<typeof usePlansQuery> extends { data?: { data: (infer T)[] } } ? T : never;
type TierRow = ReturnType<typeof useVolumeTiersQuery> extends { data?: { data: (infer T)[] } } ? T : never;

function CatalogEditor({
  plans,
  tiers,
  prices,
  packageFeeBySlug,
  promotion,
}: {
  plans: PlanRow[];
  tiers: TierRow[];
  prices: BillingPrice[];
  packageFeeBySlug: Record<string, number | null>;
  promotion: BillingPromotion | null;
}) {
  const { showAlert } = useAlert();
  const publishBatch = usePublishPriceBatch();
  // Margen real de las celdas VIGENTES (consola, Tanda C): lo que la verja
  // rechazaría hoy se ve en la rejilla antes de publicar. El borrador se evalúa
  // con `dry_run` al abrir la hoja de publicación.
  const marginCells = useMarginCellsQuery();

  // Paquetes vendibles en autoservicio y en la escalera declarada del catálogo
  // (Esencial → Crecimiento → Escala): enterprise es «a la medida» y no entra.
  const packagePlans = useMemo(
    () => plans.filter((plan) => plan.kind === "package" && plan.self_service && plan.public_slug !== null && plan.is_active),
    [plans],
  );
  const sortedTiers = useMemo(() => [...tiers].sort((a, b) => a.sort_order - b.sort_order), [tiers]);
  const latestFirst = useMemo(
    () => [...prices].sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()),
    [prices],
  );

  // Borrador de componentes: arranca de lo persistido (tarifa de tramo y de
  // paquete, ambas del servidor) y se edita en vivo.
  const [tierFees, setTierFees] = useState<Record<string, string>>(() =>
    Object.fromEntries(sortedTiers.map((tier) => [tier.code, tier.fee_cents === null ? "" : String(tier.fee_cents / 100)])),
  );
  const tierComponents: TierComponent[] = sortedTiers.map((tier) => ({
    code: tier.code,
    conversations: tier.conversations,
    label: tier.label,
    feeCents: tierFees[tier.code] === "" ? null : parseMoneyToCents(tierFees[tier.code] ?? ""),
    isActive: tier.is_active,
  }));
  const [packageFees, setPackageFees] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      packagePlans.map((plan) => {
        const fee = packageFeeBySlug[plan.public_slug as string] ?? null;
        return [plan.id, fee === null ? "" : String(fee / 100)];
      }),
    ),
  );
  const packageComponents: PackageComponent[] = packagePlans.flatMap((plan) => {
    const cents = parseMoneyToCents(packageFees[plan.id] ?? "");
    return cents === null ? [] : [{ planId: plan.id, slug: plan.public_slug as string, name: plan.name, feeCents: cents }];
  });
  const [overrides, setOverrides] = useState<Record<string, CellOverride>>({});
  // `period`, no `interval`: `setInterval` sombrearía el global (hallazgo B8).
  const [period, setPeriod] = useState<Interval>("monthly");
  const [mode, setMode] = useState<Mode>("list");
  const [publishing, setPublishing] = useState(false);
  const [overriding, setOverriding] = useState<{ planSlug: string; tierCode: string; derived: number } | null>(null);
  const [planForTimeline, setPlanForTimeline] = useState<string | undefined>(undefined);
  const [publishingPlanPrice, setPublishingPlanPrice] = useState(false);

  const cells = useMemo(() => deriveCells(packageComponents, tierComponents, overrides), [packageComponents, tierComponents, overrides]);
  const gate = useMemo(() => {
    const structural = runGate(packageComponents, tierComponents, overrides);
    const report = marginCells.data;
    if (report === undefined) return structural;
    const summary = summarizeCells(report.cells);
    // Informativo, no bloquea: mide las celdas vigentes, no el borrador. El
    // borrador pasa por la verja de margen del servidor al publicar (dry_run).
    return structural.map((check) =>
      check.key === "margin"
        ? {
            ...check,
            label: "Margen real de las celdas vigentes",
            detail:
              summary.failing === 0
                ? `Base ${BASIS_LABELS[report.basis]} · muestra de ${report.sample_size.toLocaleString("es-CO")} conversaciones`
                : `${summary.failing} celdas vigentes no pasarían la verja de margen`,
            ok: summary.failing === 0 ? true : null,
            value: summary.minP50 === null ? "sin celdas" : `mín. ${formatPct(summary.minP50)}`,
          }
        : check,
    );
  }, [packageComponents, tierComponents, overrides, marginCells.data]);
  const codeBySlug = useMemo(
    () => Object.fromEntries(packagePlans.map((plan) => [plan.public_slug as string, plan.code] as const)),
    [packagePlans],
  );
  const gateOk = gate.every((check) => check.ok !== false);
  const complete = packageComponents.length === packagePlans.length && packagePlans.length > 0;
  const currentCells = latestFirst.filter((price) => price.volume_tier !== null && price.is_current);
  const scheduledCells = latestFirst.filter((price) => price.volume_tier !== null && !price.is_current && price.effective_to === null);

  const shown = (listCents: number): number => {
    if (mode !== "promo" || promotion === null || promotion.scope === "modules") return listCents;
    const monthly = period === "annual" ? listCents / ANNUAL_MONTHS_BILLED : listCents;
    return discountedCents(monthly, promotion.percent_bps, promotion.rounding) * (period === "annual" ? ANNUAL_MONTHS_BILLED : 1);
  };

  // Componentes, no celdas (hallazgo A2): el servidor deriva las celdas, corre
  // las dos verjas (estructural y de margen) y escribe tarifas de paquete, de
  // tramo y celdas en UNA transacción. Nada cambia si algo falla.
  function batchPayload(effectiveFrom: string, dryRun: boolean) {
    return {
      dry_run: dryRun,
      effective_from: new Date(`${effectiveFrom}T05:00:00Z`).toISOString(),
      currency: "COP" as const,
      tax_treatment: "excluded" as const,
      tax_rate_bps: 0,
      package_fees: packageComponents.map((pkg) => ({ plan_id: pkg.planId, fee_cents: pkg.feeCents })),
      tier_fees: tierComponents.flatMap((tier) =>
        tier.feeCents === null ? [] : [{ code: tier.code, fee_cents: tier.feeCents }],
      ),
      overrides: Object.entries(overrides).flatMap(([key, override]) => {
        const [planSlug, tierCode] = key.split("|");
        const pkg = packageComponents.find((component) => component.slug === planSlug);
        return pkg ? [{ plan_id: pkg.planId, tier_code: tierCode, amount_cents: override.amountCents, reason: override.reason }] : [];
      }),
    };
  }

  /** Vista previa: corre las dos verjas del servidor sobre el BORRADOR sin escribir. */
  async function preview(effectiveFrom: string): Promise<MarginGateReport> {
    const result = await publishBatch.mutateAsync(batchPayload(effectiveFrom, true));
    return result.margin;
  }

  async function publish(effectiveFrom: string) {
    try {
      const result = await publishBatch.mutateAsync(batchPayload(effectiveFrom, false));
      showAlert({
        tone: "success",
        title: "Vigencia publicada",
        description: `${result.ids.length} celdas rigen desde el ${effectiveFrom} (00:00 Bogotá) con margen ${BASIS_LABELS[result.margin.basis]}. Las anteriores quedan cerradas; los términos con promoción no cambian.`,
        autoCloseMs: 8000,
      });
      setPublishing(false);
      setOverrides({});
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo publicar", description: errorMessage(error), autoCloseMs: 9000 });
    }
  }

  const timelinePlanId = planForTimeline ?? packagePlans[0]?.id ?? plans[0]?.id;
  const timelinePlan = plans.find((plan) => plan.id === timelinePlanId);
  const timelineRows = latestFirst.filter((price) => price.plan_id === timelinePlanId && price.volume_tier === null);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-brand text-[10.5px] font-semibold tracking-[0.12em] uppercase">Catálogo comercial</p>
          <h1 className="text-3xl font-semibold tracking-tight">Tarifas</h1>
          <p className="text-muted-foreground max-w-[72ch] text-sm">
            El paquete vende funciones y el tramo vende conversaciones. Nueve componentes producen las
            celdas; publicar cierra la vigencia anterior y crea una nueva. Nunca se edita una fila viva.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Periodicidad"
            value={period}
            onValueChange={setPeriod}
            items={[
              { value: "monthly", label: "Mensual" },
              { value: "annual", label: `Anual · ×${ANNUAL_MONTHS_BILLED}` },
            ]}
          />
          <SegmentedControl
            label="Precio"
            value={mode}
            onValueChange={setMode}
            items={[
              { value: "list", label: "Lista" },
              { value: "promo", label: promotion ? `${promotion.name} −${(promotion.percent_bps / 100).toFixed(0)} %` : "Con promoción", disabled: promotion === null },
            ]}
          />
          <Button disabled={!complete || !gateOk || cells.length === 0} onClick={() => setPublishing(true)}>
            Publicar vigencia
          </Button>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Vigencia actual">
          <p className="text-2xl font-semibold tracking-tight">
            {currentCells.length === 0 ? "Un eje" : formatShortDate(currentCells[0].effective_from)}
          </p>
          <p className="text-muted-foreground text-xs">
            {currentCells.length === 0
              ? `${latestFirst.filter((p) => p.volume_tier === null && p.is_current).length} filas legado sin tramo`
              : `${currentCells.length} celdas de dos ejes rigiendo`}
          </p>
        </Tile>
        <Tile label="Programada">
          <p className="text-2xl font-semibold tracking-tight">
            {scheduledCells.length === 0 ? "—" : formatShortDate(scheduledCells[0].effective_from)}
          </p>
          <p className="text-muted-foreground text-xs">
            {scheduledCells.length === 0 ? "sin vigencia futura" : `${scheduledCells.length} celdas esperan su fecha`}
          </p>
        </Tile>
        <Tile label="Borrador">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{cells.length}</p>
          <p className="text-muted-foreground text-xs">
            celdas derivadas · {Object.keys(overrides).length} anulada{Object.keys(overrides).length === 1 ? "" : "s"}
          </p>
        </Tile>
        <Tile label="Verja">
          <p className={`text-2xl font-semibold tracking-tight ${gateOk ? "text-success" : "text-destructive"}`}>
            {gate.filter((check) => check.ok === true).length}/{gate.filter((check) => check.ok !== null).length}
          </p>
          <p className="text-muted-foreground text-xs">comprobaciones estructurales · margen con la consola</p>
        </Tile>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-4">
          {packageComponents.length >= 2 && tierComponents.some((tier) => tier.feeCents !== null) ? (
            <PriceCurve packages={packageComponents} tiers={tierComponents} overrides={overrides} interval={period} shown={shown} />
          ) : null}

          <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">
                  Celdas · {period === "annual" ? `anual ×${ANNUAL_MONTHS_BILLED}` : "mensual"} · {mode === "promo" && promotion ? promotion.name : "precio de lista"}
                </h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Filas: tramo. Columnas: paquete. Una celda anulada lleva borde punteado y su motivo queda en la fila.
                </p>
              </div>
            </header>
            {!complete ? (
              <EmptyState
                glyph="money"
                title="Faltan componentes"
                description="Escribe la tarifa de cada paquete y de cada tramo en el panel derecho: la rejilla se deriva sola."
              />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <div className="grid gap-1.5" style={{ gridTemplateColumns: `130px repeat(${packageComponents.length}, minmax(150px, 1fr))` }}>
                  <div />
                  {packageComponents.map((pkg, index) => (
                    <div key={pkg.planId} className="px-2 pb-1">
                      <div className="flex items-center gap-2 text-[13.5px] font-semibold">
                        <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${SERIES_BG[index % SERIES_BG.length]}`} />
                        {pkg.name}
                      </div>
                      <div className="text-muted-foreground text-[11px] tabular-nums">paquete {formatMoney(pkg.feeCents)}</div>
                    </div>
                  ))}
                  {tierComponents.filter((tier) => tier.isActive && tier.feeCents !== null).map((tier) => (
                    <TierRowCells
                      key={tier.code}
                      tier={tier}
                      packages={packageComponents}
                      cells={cells}
                      interval={period}
                      shown={shown}
                      marginCells={marginCells.data?.cells}
                      codeBySlug={codeBySlug}
                      onOverride={(planSlug, derived) => setOverriding({ planSlug, tierCode: tier.code, derived })}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Vigencias sin tramo · {timelinePlan?.name ?? "—"}</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Filas legado de un eje, módulos y enterprise. La línea de tiempo explica por qué una factura vieja dice otro importe.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Select value={timelinePlanId ?? ""} onValueChange={setPlanForTimeline}>
                  <SelectTrigger className="w-[220px]" aria-label="Plan">
                    <SelectValue placeholder="Elige un plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — {plan.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => setPublishingPlanPrice(true)}>
                  Publicar tarifa del plan
                </Button>
              </div>
            </header>
            {timelineRows.length === 0 ? (
              <p className="text-muted-foreground border-border mt-4 rounded-xl border border-dashed p-3 text-xs">
                Este plan no tiene tarifa sin tramo. Sin tarifa vigente el ciclo no puede emitirse.
              </p>
            ) : (
              <ol className="mt-4 flex flex-col">
                {timelineRows.map((price, index) => (
                  <VigencyItem key={price.id} price={price} last={index === timelineRows.length - 1} />
                ))}
              </ol>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:self-start">
          <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Componentes</h2>
                <p className="text-muted-foreground mt-0.5 text-xs">Edita y todo se recalcula: curva, celdas y verja.</p>
              </div>
              <Badge variant="outline" className="border-info/40 bg-info/10 text-info shrink-0">
                Borrador
              </Badge>
            </header>
            <div className="mt-4 flex flex-col gap-3">
              <span className="text-muted-foreground text-[11.5px] font-medium">Tarifa de paquete · funciones (millares)</span>
              {packagePlans.map((plan, index) => (
                <div key={plan.id}>
                  <Label htmlFor={`fee-${plan.id}`} className="flex items-center gap-2 text-xs">
                    <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${SERIES_BG[index % SERIES_BG.length]}`} />
                    {plan.name}
                  </Label>
                  <Input
                    id={`fee-${plan.id}`}
                    className="mt-1 tabular-nums"
                    inputMode="numeric"
                    placeholder="90.000"
                    value={packageFees[plan.id] ?? ""}
                    onChange={(event) => setPackageFees((prev) => ({ ...prev, [plan.id]: event.target.value }))}
                  />
                </div>
              ))}
              <span className="text-muted-foreground mt-2 text-[11.5px] font-medium">Tarifa de tramo · conversaciones (.900)</span>
              <div className="grid grid-cols-2 gap-2">
                {sortedTiers.map((tier) => (
                  <div key={tier.code}>
                    <Label htmlFor={`tier-${tier.code}`} className="text-xs">
                      {tier.label} conv.{tier.is_active ? "" : " · retirado"}
                    </Label>
                    <Input
                      id={`tier-${tier.code}`}
                      className="mt-1 tabular-nums"
                      inputMode="numeric"
                      placeholder="99.900"
                      value={tierFees[tier.code] ?? ""}
                      onChange={(event) => setTierFees((prev) => ({ ...prev, [tier.code]: event.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <p className="bg-secondary rounded-lg px-2.5 py-2 font-mono text-[11.5px]">celda = paquete + tramo</p>
            </div>
          </section>

          <GatePanel gate={gate} />
        </aside>
      </div>

      <PublishBatchSheet
        open={publishing}
        onOpenChange={setPublishing}
        cellCount={cells.length}
        gate={gate}
        pending={publishBatch.isPending}
        onPreview={preview}
        onPublish={publish}
      />
      <OverrideSheet
        open={overriding !== null}
        onOpenChange={(open) => !open && setOverriding(null)}
        target={overriding}
        current={overriding ? overrides[overrideKey(overriding.planSlug, overriding.tierCode)] ?? null : null}
        onSave={(value) => {
          if (!overriding) return;
          const key = overrideKey(overriding.planSlug, overriding.tierCode);
          setOverrides((prev) => {
            const next = { ...prev };
            if (value === null) delete next[key];
            else next[key] = value;
            return next;
          });
          setOverriding(null);
        }}
        key={overriding ? `${overriding.planSlug}|${overriding.tierCode}` : "closed"}
      />
      <PublishPriceSheet
        open={publishingPlanPrice}
        onOpenChange={setPublishingPlanPrice}
        planId={timelinePlanId}
        planName={timelinePlan?.name ?? ""}
        key={publishingPlanPrice ? timelinePlanId : "closed"}
      />
    </div>
  );
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-border-soft bg-card flex flex-col gap-1 rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide">{label}</span>
      {children}
    </div>
  );
}

function TierRowCells({
  tier,
  packages,
  cells,
  interval,
  shown,
  marginCells,
  codeBySlug,
  onOverride,
}: {
  tier: TierComponent;
  packages: PackageComponent[];
  cells: ReturnType<typeof deriveCells>;
  interval: Interval;
  shown: (listCents: number) => number;
  /** Margen real de las celdas VIGENTES (consola): pinta el estado, no el borrador. */
  marginCells?: readonly MarginCell[];
  codeBySlug: Record<string, string>;
  onOverride: (planSlug: string, derived: number) => void;
}) {
  return (
    <>
      <div className="flex flex-col justify-center px-2 text-xs">
        <b className="text-[13px] font-semibold">{tier.label}</b>
        <span className="text-muted-foreground tabular-nums">tramo {formatMoney(tier.feeCents ?? 0)}</span>
      </div>
      {packages.map((pkg) => {
        const cell = cells.find((row) => row.planSlug === pkg.slug && row.tierCode === tier.code && row.interval === interval);
        if (!cell) return <div key={pkg.planId} />;
        const price = shown(cell.amountCents);
        const overridden = cell.overrideReason !== null;
        const margin = cellStatus(marginCells, codeBySlug[pkg.slug] ?? pkg.slug, tier.code, interval);
        const marginClass = margin === null ? "" : margin.failures.length > 0 ? STATUS_CLASSES.loses : STATUS_CLASSES[margin.status];
        return (
          <button
            key={pkg.planId}
            type="button"
            title={overridden ? `Anulada: ${cell.overrideReason}` : "Anular esta celda con motivo"}
            onClick={() => onOverride(pkg.slug, cell.derivedCents)}
            className={`group border-border-soft bg-card hover:border-brand/50 relative flex min-h-[72px] flex-col items-start gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${overridden ? "border-accent-amber/70 border-dashed" : ""} ${marginClass}`}
          >
            <span className="text-foreground text-[16px] font-semibold tracking-tight tabular-nums">{formatMoney(price)}</span>
            <span className="text-muted-foreground text-[11px]">
              {interval === "annual" ? `al año · ${ANNUAL_MONTHS_BILLED} de 12 meses` : "al mes"}
              {price !== cell.amountCents ? ` · lista ${formatMoney(cell.amountCents)}` : ""}
            </span>
            {margin !== null ? (
              <span
                className="text-[11px] font-medium tabular-nums"
                title={margin.failures[0]?.detail ?? margin.warnings[0]?.detail ?? `Margen real a p50 de la celda vigente · ${BASIS_LABELS[margin.basis]} · ${SCOPE_LABELS[margin.sample_scope]}`}
              >
                {formatPct(margin.margin_real_p50)}
                {margin.failures.length > 0 ? " · falla la verja" : margin.status === "bonus_only" ? " · solo bono" : ""}
              </span>
            ) : null}
            {overridden ? (
              <Badge variant="outline" className="border-accent-amber/40 bg-accent-amber/10 text-accent-amber absolute top-2 right-2">
                anulada
              </Badge>
            ) : (
              <span className="text-brand absolute right-3 bottom-2 text-[11px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                Anular…
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

/**
 * Curva de precio por volumen: una línea por paquete, desplazadas por su
 * tarifa fija. Direct labels al final de cada línea (identidad no solo por
 * color) y tooltip por tramo al pasar el cursor.
 */
function PriceCurve({
  packages,
  tiers,
  overrides,
  interval,
  shown,
}: {
  packages: PackageComponent[];
  tiers: TierComponent[];
  overrides: Record<string, CellOverride>;
  interval: Interval;
  shown: (listCents: number) => number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const activeTiers = tiers.filter((tier) => tier.isActive && tier.feeCents !== null);
  const cells = deriveCells(packages, activeTiers, overrides).filter((cell) => cell.interval === interval);
  const series = packages.map((pkg) =>
    activeTiers.map((tier) => shown(cells.find((cell) => cell.planSlug === pkg.slug && cell.tierCode === tier.code)?.amountCents ?? 0)),
  );
  const W = 680;
  const H = 280;
  const L = 64;
  const R = 90;
  const T = 18;
  const B = 40;
  const iw = W - L - R;
  const ih = H - T - B;
  const max = Math.max(1, ...series.flat()) * 1.08;
  const x = (index: number) => L + (iw * index) / Math.max(1, activeTiers.length - 1);
  const y = (value: number) => T + ih - (value / max) * ih;
  const ticks = 5;
  const fmtShort = (cents: number) => {
    const cop = cents / 100;
    return cop >= 1_000_000 ? `${(cop / 1_000_000).toFixed(1).replace(".", ",")} M` : `${Math.round(cop / 1000)} k`;
  };

  return (
    <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Curva de precio por volumen</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Cada paquete es una línea paralela desplazada por su tarifa fija: con volumen alto las tres se acercan.
          </p>
        </div>
        <ul className="text-muted-foreground flex flex-wrap gap-3 text-[11.5px]">
          {packages.map((pkg, index) => (
            <li key={pkg.planId} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-[3px] w-3 rounded ${SERIES_BG[index % SERIES_BG.length]}`} />
              {pkg.name}
            </li>
          ))}
        </ul>
      </header>
      <div className="relative mt-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Precio por tramo y paquete" onMouseLeave={() => setHover(null)}>
          {Array.from({ length: ticks + 1 }, (_, index) => {
            const value = (max * index) / ticks;
            return (
              <g key={index}>
                <line x1={L} x2={W - R} y1={y(value)} y2={y(value)} className="stroke-foreground/10" strokeWidth={1} />
                <text x={L - 8} y={y(value) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
                  {index === 0 ? "0" : fmtShort(value)}
                </text>
              </g>
            );
          })}
          {hover !== null ? <line x1={x(hover)} x2={x(hover)} y1={T} y2={T + ih} className="stroke-foreground/30" strokeDasharray="3 3" /> : null}
          {series.map((values, sIndex) => {
            const path = values.map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`).join(" ");
            const cls = SERIES[sIndex % SERIES.length];
            return (
              <g key={packages[sIndex].planId}>
                <path d={path} className={cls.split(" ")[0]} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {values.map((value, index) => (
                  <circle key={index} cx={x(index)} cy={y(value)} r={hover === index ? 5 : 3.5} className={`${cls.split(" ")[1]} stroke-background`} strokeWidth={2} />
                ))}
                <text
                  x={x(activeTiers.length - 1) + 8}
                  y={y(values[values.length - 1] ?? 0) + 4}
                  className={`${SERIES_TEXT[sIndex % SERIES_TEXT.length]} fill-current text-[11px] font-semibold`}
                >
                  {packages[sIndex].name}
                </text>
              </g>
            );
          })}
          {activeTiers.map((tier, index) => (
            <g key={tier.code}>
              <text x={x(index)} y={H - 14} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {tier.label}
              </text>
              <rect
                x={x(index) - iw / Math.max(1, activeTiers.length - 1) / 2}
                y={T}
                width={iw / Math.max(1, activeTiers.length - 1)}
                height={ih}
                fill="transparent"
                onMouseEnter={() => setHover(index)}
              />
            </g>
          ))}
          <text x={L} y={H - 1} className="fill-muted-foreground text-[10px]">
            conversaciones con IA al mes
          </text>
        </svg>
        {hover !== null && activeTiers[hover] ? (
          <div
            className="border-border bg-card pointer-events-none absolute top-2 min-w-[190px] -translate-x-1/2 rounded-xl border p-2.5 text-[11.5px] shadow-[var(--shadow-overlay)]"
            style={{ left: `${(x(hover) / W) * 100}%` }}
          >
            <div className="mb-1 font-semibold">
              {activeTiers[hover].label} conversaciones · {interval === "annual" ? "al año" : "al mes"}
            </div>
            {packages.map((pkg, index) => (
              <div key={pkg.planId} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span aria-hidden="true" className={`size-2 rounded-[2px] ${SERIES_BG[index % SERIES_BG.length]}`} />
                  {pkg.name}
                </span>
                <b className="tabular-nums">{formatMoney(series[index]?.[hover] ?? 0)}</b>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function GatePanel({ gate }: { gate: GateCheck[] }) {
  const evaluated = gate.filter((check) => check.ok !== null);
  const passed = evaluated.filter((check) => check.ok === true).length;
  const bad = evaluated.length - passed;
  return (
    <section className="border-border-soft bg-card rounded-2xl border p-4 shadow-[var(--shadow-float)]">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold">Verja en vivo</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">Lo mismo que correrá al publicar.</p>
        </div>
        <div
          className="relative grid size-11 place-items-center rounded-full font-mono text-xs font-semibold"
          style={{
            background: `conic-gradient(${bad > 0 ? "var(--axi-destructive)" : "var(--axi-success)"} ${(passed / Math.max(1, evaluated.length)) * 100}%, var(--color-secondary) 0)`,
          }}
          aria-label={`${passed} de ${evaluated.length} comprobaciones en verde`}
        >
          <span className="bg-card absolute inset-1 rounded-full" aria-hidden="true" />
          <span className="relative">
            {passed}/{evaluated.length}
          </span>
        </div>
      </header>
      <ul className="mt-3 divide-y">
        {gate.map((check) => (
          <li key={check.key} className="grid grid-cols-[18px_1fr_auto] items-start gap-2.5 py-2 text-xs">
            <span
              aria-hidden="true"
              className={`grid size-[18px] place-items-center rounded-full text-[11px] font-bold ${
                check.ok === null
                  ? "bg-secondary text-muted-foreground"
                  : check.ok
                    ? "bg-success text-success-foreground"
                    : "bg-destructive text-destructive-foreground"
              }`}
            >
              {check.ok === null ? "…" : check.ok ? "✓" : "✕"}
            </span>
            <span>
              <span className={check.ok === null ? "text-muted-foreground" : ""}>{check.label}</span>
              <span className="text-muted-foreground block text-[11px]">{check.detail}</span>
            </span>
            <span className="text-muted-foreground font-mono text-[11px] whitespace-nowrap">{check.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PublishBatchSheet({
  open,
  onOpenChange,
  cellCount,
  gate,
  pending,
  onPreview,
  onPublish,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellCount: number;
  gate: GateCheck[];
  pending: boolean;
  onPreview: (effectiveFrom: string) => Promise<MarginGateReport>;
  onPublish: (effectiveFrom: string) => Promise<void>;
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
  const blocked = gate.filter((check) => check.ok === false);
  // Verja de MARGEN del borrador (dry_run en el servidor): se corre al abrir y
  // al cambiar la fecha (la promo abierta depende de ella). Un 409 trae los
  // motivos en `details.failures`; se muestran igual que un informe con fallos.
  const [report, setReport] = useState<MarginGateReport | { failures: GateFailureLike[]; basis?: string } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    if (!open || blocked.length > 0 || effectiveFrom === "") return;
    let cancelled = false;
    setPreviewing(true);
    setPreviewError(null);
    onPreview(effectiveFrom)
      .then((result) => {
        if (!cancelled) setReport(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const details = isHttpError(error) ? error.problem?.details : undefined;
        const failures = Array.isArray(details?.failures) ? (details.failures as GateFailureLike[]) : null;
        if (failures !== null) setReport({ failures, basis: typeof details?.basis === "string" ? details.basis : undefined });
        else setReport(null);
        setPreviewError(errorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setPreviewing(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onPreview cambia en cada render; la verja depende de open/fecha
  }, [open, effectiveFrom, blocked.length]);
  const marginFailures = report?.failures ?? [];
  const marginWarnings = report !== null && "warnings" in report ? report.warnings : [];
  const marginBlocked = marginFailures.length > 0 || previewing || (previewError !== null && report === null);
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} size="md" title="Publicar vigencia" subtitle={`Cierra la vigencia actual y crea ${cellCount} celdas en una sola transacción.`}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-muted-foreground border-info/24 bg-info/8 rounded-xl border p-3 text-xs leading-relaxed">
          Las celdas rigen desde las <b>00:00 de Bogotá</b> de la fecha elegida. Las facturas ya emitidas y los términos con
          promoción conservan su precio: por eso una tarifa se sucede en vez de editarse.
        </p>
        <div>
          <Label htmlFor="batch-from">Vigente desde *</Label>
          <Input id="batch-from" type="date" className="mt-1.5 tabular-nums" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
        </div>
        <GatePanel gate={gate} />
        {blocked.length > 0 ? (
          <p className="text-destructive border-destructive/40 bg-destructive/8 rounded-xl border p-3 text-xs">
            No se puede publicar: {blocked[0].label} — {blocked[0].detail} ({blocked[0].value}).
          </p>
        ) : null}
        <section aria-label="Verja de margen del borrador" className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold">
            Verja de margen del borrador{" "}
            <span className="text-muted-foreground text-xs font-normal">
              {previewing
                ? "· evaluando…"
                : report !== null && "sample_size" in report
                  ? `· base ${BASIS_LABELS[report.basis]} · ${report.sample_size.toLocaleString("es-CO")} conversaciones · TRM ${report.trm_cop_per_usd.toLocaleString("es-CO")}`
                  : ""}
            </span>
          </h3>
          {previewError !== null && report === null ? (
            <p className="text-destructive border-destructive/40 bg-destructive/8 rounded-xl border p-3 text-xs">{previewError}</p>
          ) : null}
          {marginFailures.map((failure, index) => (
            <p key={`f-${index}`} className="text-destructive border-destructive/40 bg-destructive/8 rounded-xl border p-2.5 text-xs">
              <b className="block font-mono text-[11px]">{GATE_CHECK_LABELS[failure.check] ?? failure.check}</b>
              {failure.detail}
            </p>
          ))}
          {marginWarnings.map((warning, index) => (
            <p key={`w-${index}`} className="text-warning border-warning/40 bg-warning/8 rounded-xl border p-2.5 text-xs">
              <b className="block font-mono text-[11px]">{GATE_CHECK_LABELS[warning.check] ?? warning.check}</b>
              {warning.detail}
            </p>
          ))}
          {!previewing && report !== null && marginFailures.length === 0 ? (
            <p className="text-success border-success/40 bg-success/10 rounded-xl border p-2.5 text-xs">
              La verja de margen pasa. La base con que pasó queda guardada con la publicación.
            </p>
          ) : null}
          {marginFailures.length > 0 ? (
            <p className="text-muted-foreground text-xs">
              No hay «publicar de todos modos»: se arregla el componente o se cambia el mínimo declarado en Parámetros, con firma y fecha.
            </p>
          ) : null}
        </section>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={pending || blocked.length > 0 || marginBlocked || effectiveFrom === ""} onClick={() => void onPublish(effectiveFrom)}>
            Publicar {cellCount} celdas
          </Button>
        </div>
      </div>
    </DetailSheet>
  );
}

function OverrideSheet({
  open,
  onOpenChange,
  target,
  current,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: { planSlug: string; tierCode: string; derived: number } | null;
  current: CellOverride | null;
  onSave: (value: CellOverride | null) => void;
}) {
  const [amount, setAmount] = useState(current ? String(current.amountCents / 100) : "");
  const [reason, setReason] = useState(current?.reason ?? "");
  const cents = parseMoneyToCents(amount);
  const ready = cents !== null && reason.trim().length >= 3;
  return (
    <DetailSheet open={open} onOpenChange={onOpenChange} size="md" title="Anular celda" subtitle={target ? `${target.planSlug} · ${target.tierCode}` : undefined}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-muted-foreground border-info/24 bg-info/8 rounded-xl border p-3 text-xs leading-relaxed">
          Derivada: <b className="tabular-nums">{target ? formatMoney(target.derived) : ""}</b>. Una celda anulada sigue
          pasando redondeo y monotonía; solo queda exenta de la aditividad, y el motivo queda escrito en la fila.
        </p>
        <div>
          <Label htmlFor="ov-amount">Precio mensual de la celda (COP) *</Label>
          <Input id="ov-amount" className="mt-1.5 tabular-nums" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <div>
          <Label htmlFor="ov-reason">Motivo (obligatorio) *</Label>
          <Input id="ov-reason" className="mt-1.5" placeholder="Piso de Enterprise: la celda no puede igualar el «Desde $2.900.000»" value={reason} onChange={(event) => setReason(event.target.value)} />
        </div>
        <div className="flex justify-between gap-2">
          {current ? (
            <Button variant="ghost" onClick={() => onSave(null)}>
              Quitar anulación
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button disabled={!ready} onClick={() => cents !== null && onSave({ amountCents: cents, reason: reason.trim() })}>
              Guardar en el borrador
            </Button>
          </div>
        </div>
      </div>
    </DetailSheet>
  );
}

/** Un tramo de la línea de tiempo. El vigente lleva el punto coral. */
function VigencyItem({ price, last }: { price: BillingPrice; last: boolean }) {
  return (
    <li className="relative grid grid-cols-[12px_1fr] gap-x-4">
      {!last ? <span aria-hidden="true" className="bg-border absolute top-4 bottom-0 left-[5px] w-[1.5px]" /> : null}
      <span
        aria-hidden="true"
        className={price.is_current ? "bg-primary ring-primary/20 mt-[5px] size-[11px] rounded-full ring-4" : "bg-border mt-[5px] size-[11px] rounded-full"}
      />
      <div className={last ? "flex flex-col gap-1.5" : "flex flex-col gap-1.5 pb-6"}>
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight tabular-nums">{formatMoney(price.amount_cents, price.currency)}</span>
          <StatusBadge status={vigencyKey(price)} map={PRICE_VIGENCY_MAP} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {INTERVAL_LABELS[price.interval]} · desde {formatShortDate(price.effective_from)}
            {price.effective_to === null ? " · sin fin" : ` hasta ${formatShortDate(price.effective_to)}`}
          </span>
        </div>
        <Badge variant="outline" className="text-muted-foreground w-fit text-[10.5px]">
          {taxLabel(price.tax_treatment, price.tax_rate_bps)}
        </Badge>
        {price.publication === null ? null : (
          <span className="text-muted-foreground text-xs">
            Verja de margen: base {BASIS_LABELS[price.publication.basis]} · {price.publication.sample_size.toLocaleString("es-CO")} conversaciones · TRM{" "}
            {price.publication.trm_cop_per_usd.toLocaleString("es-CO")} · {price.publication.gateway.provider} {price.publication.gateway.method}
          </span>
        )}
        {price.overage_rates.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sin excedentes facturables</span>
        ) : (
          <ul className="mt-0.5 flex flex-wrap gap-1.5">
            {price.overage_rates.map((rate) => (
              <li key={rate.metric} className="border-border bg-secondary text-muted-foreground rounded-lg border px-2 py-1 text-[11px]">
                {OVERAGE_METRIC_LABELS[rate.metric]} · <b className="text-foreground font-medium tabular-nums">{formatMoney(rate.amount_cents_per_unit, price.currency)}</b> {unitSizeLabel(rate)} · {includedLabel(rate)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
