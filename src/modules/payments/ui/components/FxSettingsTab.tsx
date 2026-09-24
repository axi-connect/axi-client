"use client";

import { useCallback, useEffect, useState } from "react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { FxSettingsDTO, LatestFxRateDTO } from "@/modules/payments/domain/fx-settings";
import {
  getFxSettings,
  getLatestFxRate,
  saveFxSettings,
} from "@/modules/payments/infrastructure/services/fx-service.adapter";
import { FeatureDisabledState } from "./FeatureDisabledState";
import { FxRateCard } from "./FxRateCard";
import { FxSettingsForm } from "./FxSettingsForm";

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
      <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Cargando moneda y TRM">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
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
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Tu plan no incluye la capacidad <strong className="font-medium">Ventas</strong>, de la que depende cotizar en otra
        moneda.
      </p>
    );
  }

  if (state.kind === "error") {
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <FxRateCard latest={state.latest} onRefresh={() => void refresh()} refreshing={refreshing} />
      <FxSettingsForm
        settings={state.settings}
        latest={state.latest}
        saving={saving}
        onSave={(next) => void save(next)}
      />
    </div>
  );
}
