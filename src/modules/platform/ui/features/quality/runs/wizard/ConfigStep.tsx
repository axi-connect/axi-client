"use client";

/**
 * Paso 2 · Configuración. QA: suite XOR escenarios (radio) + concurrencia
 * (hint: el servidor clampa a 8). Estrés: mock ($0, sin tool_calls) o real
 * (costo LLM, tope de gasto) + presupuesto de ocupación EN VIVO — la barra
 * usa `alertProgressPct` y el paso se bloquea si excede los 3600 s.
 */
import { useMemo } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { MultiSelect } from "@/shared/components/features/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import {
  SERVER_MAX_CONCURRENCY,
  STRESS_BUDGET_S,
  type RunAiMode,
  type RunKind,
} from "../../../../../domain/quality-runs";
import { alertProgressPct } from "../../../../../domain/thresholds";
import {
  DATASET_KIND_HINTS,
  DATASET_KIND_LABELS,
  DATASET_KINDS,
  PROBE_K_MAX,
  PROBE_MAX_ITEMS,
  PROBE_SPEND_CAP_MAX,
  probePaysLlm,
  type DatasetKind,
} from "../../../../../domain/quality-datasets";
import { useDatasetsQuery } from "../../../../../infrastructure/api/hooks/use-quality-datasets";
import { useScenariosQuery } from "../../../../../infrastructure/api/hooks/use-quality-scenarios";
import { useSuitesQuery } from "../../../../../infrastructure/api/hooks/use-quality-suites";
import {
  configOccupancySeconds,
  validateRunConfig,
  type QaScopeMode,
  type RunConfigValues,
} from "./run-config";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

type ConfigStepProps = {
  values: RunConfigValues;
  /** Tenant elegido en el paso 1: los datasets del probe son de ese tenant. */
  companyId: string | null;
  onChange: (values: RunConfigValues) => void;
  onBack: () => void;
  onNext: () => void;
};

/**
 * Configuración del probe (F4): capacidad → dataset del tenant de esa
 * capacidad (solo con ítems etiquetados) → k, límite y tope (obligatorio
 * cuando la capacidad paga LLM). La estimación dice cuántos ítems corren y
 * si cuesta.
 */
function ProbeConfig({
  values,
  companyId,
  patch,
}: {
  values: RunConfigValues;
  companyId: string | null;
  patch: (partial: Partial<RunConfigValues>) => void;
}) {
  const datasetsQuery = useDatasetsQuery({
    companyId: companyId ?? undefined,
    kind: values.probeKind,
    status: "active",
    page: 1,
    pageSize: 100,
  });
  const datasets = datasetsQuery.data?.data ?? [];
  const chosen = datasets.find((dataset) => dataset.id === values.datasetId) ?? null;
  const paysLlm = probePaysLlm(values.probeKind);
  const itemsToRun = chosen ? Math.min(chosen.labeled_count, values.limitItems ?? PROBE_MAX_ITEMS) : 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Capacidad *</Label>
        <Select
          value={values.probeKind}
          onValueChange={(probeKind) => patch({ probeKind: probeKind as DatasetKind, datasetId: null })}
        >
          <SelectTrigger className="w-full" aria-label="Capacidad a probar">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DATASET_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {DATASET_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{DATASET_KIND_HINTS[values.probeKind]}</p>
      </div>

      <div className="space-y-1.5">
        <Label>Dataset *</Label>
        <Select
          value={values.datasetId ?? ""}
          onValueChange={(datasetId) => patch({ datasetId })}
          disabled={!companyId || datasetsQuery.isPending}
        >
          <SelectTrigger className="w-full" aria-label="Dataset a probar">
            <SelectValue
              placeholder={
                !companyId ? "Elige el tenant en el paso 1" : datasetsQuery.isPending ? "Cargando datasets…" : "Elige el dataset"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((dataset) => (
              <SelectItem key={dataset.id} value={dataset.id} disabled={dataset.labeled_count === 0}>
                {dataset.name}{" "}
                <span className="text-muted-foreground">
                  · {dataset.items_count} ítems ({dataset.labeled_count} etiquetados)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Solo se prueban los ítems etiquetados.{" "}
          {companyId && !datasetsQuery.isPending && datasets.length === 0 && (
            <Link href="/platform/quality/datasets" prefetch={false} className="underline underline-offset-2">
              Este tenant no tiene datasets de esta capacidad: créalo.
            </Link>
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="probe-k">k (top-k)</Label>
          <Input
            id="probe-k"
            type="number"
            min={1}
            max={PROBE_K_MAX}
            value={values.k}
            onChange={(e) => patch({ k: toInt(e.target.value) })}
            disabled={values.probeKind !== "catalog_search"}
          />
          <p className="text-xs text-muted-foreground">
            {values.probeKind === "catalog_search" ? "Coincide con lo que la tool muestra al cliente." : "Solo aplica a la búsqueda."}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="probe-limit">Límite de ítems</Label>
          <Input
            id="probe-limit"
            type="number"
            min={1}
            max={PROBE_MAX_ITEMS}
            value={values.limitItems ?? ""}
            placeholder={chosen ? String(Math.min(chosen.labeled_count, PROBE_MAX_ITEMS)) : "todos"}
            onChange={(e) => patch({ limitItems: e.target.value === "" ? null : toInt(e.target.value) })}
          />
          <p className="text-xs text-muted-foreground">Máx. {PROBE_MAX_ITEMS} por corrida.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="probe-cap">Tope de gasto (USD)</Label>
          <Input
            id="probe-cap"
            type="number"
            min={0.5}
            max={PROBE_SPEND_CAP_MAX}
            step={0.5}
            value={paysLlm ? values.probeSpendCapUsd : ""}
            placeholder={paysLlm ? "" : "—"}
            disabled={!paysLlm}
            onChange={(e) => patch({ probeSpendCapUsd: Number(e.target.value) || 0 })}
          />
          <p className="text-xs text-muted-foreground">
            {paysLlm ? "Visión o clasificador por ítem: obligatorio." : "La búsqueda no llama a ningún LLM: cuesta US$ 0."}
          </p>
        </div>
      </div>

      <Alert variant="info">
        <AlertDescription>
          <strong>Estimación:</strong>{" "}
          {chosen
            ? `${itemsToRun} ítems · ${paysLlm ? "1 llamada LLM por ítem, topada" : "~35 ms cada uno · 0 llamadas LLM"}. Toma el lock de corridas del tenant mientras corre.`
            : "elige un dataset para ver cuántos ítems correrán."}
        </AlertDescription>
      </Alert>
    </div>
  );
}

function toInt(raw: string, fallback = 0): number {
  const value = Number(raw);
  return raw === "" || !Number.isFinite(value) ? fallback : value;
}

export function ConfigStep({ values, companyId, onChange, onBack, onNext }: ConfigStepProps) {
  const suitesQuery = useSuitesQuery({ status: "active", page: 1, pageSize: 100 });
  const scenariosQuery = useScenariosQuery(
    { status: "active", page: 1, pageSize: 100 },
    { enabled: values.kind === "qa" },
  );

  const errors = validateRunConfig(values);
  const occupancy = configOccupancySeconds(values);
  const occupancyPct = alertProgressPct(occupancy, STRESS_BUDGET_S);

  const scenarioOptions = useMemo(
    () =>
      (scenariosQuery.data?.data ?? []).map((scenario) => ({
        label: `${scenario.code} — ${scenario.name}`,
        value: scenario.id,
      })),
    [scenariosQuery.data],
  );

  function patch(partial: Partial<RunConfigValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <div className="space-y-5">
      {/* Elección de tipo de ejecución: no hay panel por pestaña —el formulario
          de abajo cambia—, así que es un radiogroup, no unas pestañas. */}
      <SegmentedControl
        value={values.kind}
        onValueChange={(kind) => patch({ kind })}
        label="Tipo de ejecución"
        className="w-full [&>button]:flex-1"
        items={[
          { value: "qa" as RunKind, label: "QA — escenarios con juez" },
          { value: "stress" as RunKind, label: "Estrés — carga sintética" },
          { value: "probe" as RunKind, label: "Probe — capacidad × dataset" },
        ]}
      />

      {values.kind === "probe" ? (
        <ProbeConfig values={values} companyId={companyId} patch={patch} />
      ) : values.kind === "qa" ? (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Alcance</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Alcance de la ejecución">
              {(
                [
                  { mode: "suite", label: "Por suite" },
                  { mode: "scenarios", label: "Por escenarios" },
                ] as { mode: QaScopeMode; label: string }[]
              ).map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={values.qaMode === mode}
                  onClick={() => patch({ qaMode: mode })}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    values.qaMode === mode
                      ? "border-primary/40 bg-accent font-medium text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          {values.qaMode === "suite" ? (
            <div className="space-y-1.5">
              <Label>Suite *</Label>
              <Select
                value={values.suiteId ?? ""}
                onValueChange={(suiteId) => patch({ suiteId })}
                disabled={suitesQuery.isPending}
              >
                <SelectTrigger className="w-full" aria-label="Suite a ejecutar">
                  <SelectValue placeholder={suitesQuery.isPending ? "Cargando suites…" : "Elige la suite"} />
                </SelectTrigger>
                <SelectContent>
                  {(suitesQuery.data?.data ?? []).map((suite) => (
                    <SelectItem key={suite.id} value={suite.id}>
                      {suite.name}{" "}
                      <span className="text-muted-foreground">
                        · {suite.scenarios_count} {suite.scenarios_count === 1 ? "escenario" : "escenarios"}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Los escenarios archivados de la suite se omiten al ejecutar.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Escenarios * (1–50)</Label>
              <MultiSelect
                options={scenarioOptions}
                defaultValue={values.scenarioIds}
                onValueChange={(scenarioIds) => patch({ scenarioIds })}
                placeholder="Elige los escenarios a ejecutar"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="run-concurrency">Concurrencia</Label>
            <Input
              id="run-concurrency"
              type="number"
              min={1}
              max={16}
              className="w-32"
              value={values.concurrency}
              onChange={(e) => patch({ concurrency: toInt(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Cases en paralelo; el servidor limita a {SERVER_MAX_CONCURRENCY} aunque pidas más.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Modo IA</legend>
            <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Modo IA">
              {(
                [
                  {
                    mode: "mock",
                    title: "Mock · $0",
                    hint: "Clon con proveedor simulado: mide mensajería y pipeline, no emite tool_calls.",
                  },
                  {
                    mode: "real",
                    title: "Real · consume LLM",
                    hint: "Usa el agente tal cual (tools incluidas). Costo a plataforma; lanzar en horario valle.",
                  },
                ] as { mode: RunAiMode; title: string; hint: string }[]
              ).map(({ mode, title, hint }) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={values.aiMode === mode}
                  onClick={() => patch({ aiMode: mode })}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                    values.aiMode === mode
                      ? "border-primary/50 bg-accent"
                      : "border-border hover:border-foreground/20",
                  )}
                >
                  <span className="block text-sm font-medium">{title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="run-conversations">Conversaciones * (1–200)</Label>
              <Input
                id="run-conversations"
                type="number"
                min={1}
                max={200}
                value={values.conversations}
                onChange={(e) => patch({ conversations: toInt(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-turns">Turnos por conversación * (1–10)</Label>
              <Input
                id="run-turns"
                type="number"
                min={1}
                max={10}
                value={values.turnsPerConversation}
                onChange={(e) => patch({ turnsPerConversation: toInt(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="run-latency">Latencia mock (ms)</Label>
              <Input
                id="run-latency"
                type="number"
                min={0}
                max={30000}
                step={100}
                value={values.mockLatencyMs}
                onChange={(e) => patch({ mockLatencyMs: toInt(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Simula el tiempo de respuesta del LLM (mín. efectivo 800 ms).</p>
            </div>
            {values.aiMode === "real" && (
              <div className="space-y-1.5">
                <Label htmlFor="run-spend-cap">Tope de gasto (USD)</Label>
                <Input
                  id="run-spend-cap"
                  type="number"
                  min={0.5}
                  max={500}
                  step={0.5}
                  value={values.spendCapUsd}
                  onChange={(e) => patch({ spendCapUsd: Number(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Se valida ANTES de arrancar contra el pricing vigente del modelo.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-xl border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Ocupación estimada</span>
              <span className={cn("tabular-nums", occupancy > STRESS_BUDGET_S ? "text-destructive font-medium" : "text-muted-foreground")}>
                {Math.round(occupancy)} s / {STRESS_BUDGET_S} s
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border" role="presentation">
              <div
                className={cn("h-full rounded-full transition-all", occupancy > STRESS_BUDGET_S ? "bg-destructive" : "bg-accent-amber")}
                style={{ width: `${occupancyPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              conversaciones × turnos × latencia. Si excede el presupuesto, el backend rechaza la ejecución.
            </p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert aria-hidden="true" />
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack}>
          Atrás
        </Button>
        <Button onClick={onNext} disabled={errors.length > 0}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
