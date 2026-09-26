"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/core/lib/format";
import { InkIsland, Kicker } from "@/shared/components/features/bento";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  formatRate,
  FX_SAMPLE_CENTS,
  sampleQuoteCents,
  spreadToPercent,
  type FxSettingsDTO,
  type LatestFxRateDTO,
} from "@/modules/payments/domain/fx-settings";
import {
  getFxSettings,
  getLatestFxRate,
  saveFxSettings,
} from "@/modules/payments/infrastructure/services/fx-service.adapter";
import { FeatureDisabledState } from "./FeatureDisabledState";
import { FxRateCard } from "./FxRateCard";
import { FxSettingsForm, type FxDraft } from "./FxSettingsForm";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; settings: FxSettingsDTO; latest: LatestFxRateDTO }
  | { kind: "feature_off" }
  | { kind: "forbidden" }
  | { kind: "error"; message: string };

/**
 * Pestaña «Moneda y TRM» del hub Pagos (F2 del programa Cobros). Autosuficiente
 * como `PaymentMethodsTab`: carga la tasa y los ajustes, guarda y repinta.
 *
 * Tres negativas distintas y tres mensajes distintos: sin la función (403
 * `features/feature_disabled`) se explica cómo encenderla; sin la capacidad del
 * plan se manda a ampliarlo; un fallo de red se puede reintentar.
 */
export function FxSettingsTab() {
  const { showAlert } = useAlert();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<FxDraft | null>(null);

  const load = useCallback(async () => {
    try {
      const [settings, latest] = await Promise.all([getFxSettings(), getLatestFxRate()]);
      setState({ kind: "ready", settings, latest });
    } catch (error) {
      if (isHttpError(error) && error.is(API_ERROR_CODES.featureDisabled)) {
        setState({ kind: "feature_off" });
        return;
      }
      if (isHttpError(error) && error.is(API_ERROR_CODES.capabilityNotGranted)) {
        setState({ kind: "forbidden" });
        return;
      }
      setState({ kind: "error", message: errorMessage(error, "No se pudo cargar la moneda") });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: FxSettingsDTO) => {
    setSaving(true);
    try {
      const saved = await saveFxSettings(next);
      const latest = await getLatestFxRate();
      setState({ kind: "ready", settings: saved, latest });
      showAlert({ tone: "success", title: "Ajustes de moneda guardados" });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar", description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (state.kind === "loading") {
    return (
      <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Cargando moneda y TRM">
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-72 rounded-3xl md:col-span-2" />
      </div>
    );
  }

  if (state.kind === "feature_off") {
    return (
      <FeatureDisabledState
        title="Esta función está apagada"
        description="«Precios en otra moneda» no está activa para tu negocio. Si vendes en otra moneda, enciéndela en Mi empresa › Funciones."
        code="fx_quotes"
      />
    );
  }

  if (state.kind === "forbidden") {
    return (
      <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Tu plan no incluye la capacidad <strong className="font-medium">Ventas</strong>, de la que depende cotizar en otra
        moneda.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-flow-dense xl:grid-cols-[repeat(2,minmax(0,1fr))_minmax(17rem,21rem)] [&>*]:min-w-0">
      <FxRateCard latest={state.latest} onRefresh={() => void refresh()} refreshing={refreshing} />
      <QuoteIsland latest={state.latest} draft={draft ?? { currency: state.settings.settlement_currency, indicative: state.settings.show_indicative_quotes }} />
      <div className="md:col-span-2">
        <FxSettingsForm settings={state.settings} saving={saving} onSave={(next) => void save(next)} onDraftChange={setDraft} />
      </div>
    </div>
  );
}

const CURRENCY_NAMES: Record<string, string> = { COP: "pesos colombianos", USD: "dólares", MXN: "pesos mexicanos" };

/**
 * La isla de la pestaña (§9.5.1, brillo `ai`: muestra lo que dice el agente).
 * Refleja el borrador en vivo —pesos sí o no, moneda de cobro— y la cifra sale
 * de la tasa que manda HOY, la misma de la ficha: nunca dos números distintos.
 */
function QuoteIsland({ latest, draft }: { latest: LatestFxRateDTO; draft: FxDraft }) {
  const sample = sampleQuoteCents(latest);
  const effective = latest.effective;
  return (
    <InkIsland
      label="Así cotiza el agente hoy"
      glow="ai"
      className="gap-4 md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1"
    >
      <div className="flex flex-col gap-1.5">
        <Kicker>Así cotiza el agente hoy</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
          {draft.indicative ? "El precio y su equivalente en pesos" : "Solo el precio del catálogo"}
        </p>
      </div>
      <p className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm">
        {draft.indicative && sample !== null ? (
          <>
            {formatMoney(FX_SAMPLE_CENTS, "USD")} ·{" "}
            <span className="font-semibold whitespace-nowrap tabular-nums">≈ {formatMoney(sample, "COP")} a la tasa de hoy</span>
          </>
        ) : draft.indicative ? (
          "Sin tasa hoy: da el precio del catálogo y el valor en pesos se fija al confirmar."
        ) : (
          `${formatMoney(FX_SAMPLE_CENTS, "USD")} — el valor en pesos se dice al confirmar el pedido.`
        )}
      </p>
      <dl className="mt-auto flex flex-col text-[13px]">
        <div className="flex justify-between gap-3 border-t border-border py-2.5">
          <dt className="text-muted-foreground">Tasa que usa</dt>
          <dd className="text-right tabular-nums">
            {effective === null
              ? "sin tasa"
              : effective.source === "tenant_override"
                ? `$ ${formatRate(effective.rate)} · manual`
                : `$ ${formatRate(effective.rate)} · TRM + ${spreadToPercent(effective.spread_bps)} %`}
          </dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border py-2.5">
          <dt className="text-muted-foreground">Se fija</dt>
          <dd>al confirmar el pedido</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border py-2.5">
          <dt className="text-muted-foreground">Cobra en</dt>
          <dd>{CURRENCY_NAMES[draft.currency] ?? draft.currency}</dd>
        </div>
      </dl>
    </InkIsland>
  );
}
