"use client";

/**
 * Paso 2 · Configuración. QA: suite XOR escenarios (radio) + concurrencia
 * (hint: el servidor clampa a 8). Estrés: mock ($0, sin tool_calls) o real
 * (costo LLM, tope de gasto) + presupuesto de ocupación EN VIVO — la barra
 * usa `alertProgressPct` y el paso se bloquea si excede los 3600 s.
 */
import { useMemo } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  SERVER_MAX_CONCURRENCY,
  STRESS_BUDGET_S,
  type RunAiMode,
  type RunKind,
} from "../../../../../domain/quality-runs";
import { alertProgressPct } from "../../../../../domain/thresholds";
import { useScenariosQuery } from "../../../../../infrastructure/api/hooks/use-quality-scenarios";
import { useSuitesQuery } from "../../../../../infrastructure/api/hooks/use-quality-suites";
import {
  configOccupancySeconds,
  validateRunConfig,
  type QaScopeMode,
  type RunConfigValues,
} from "./run-config";

type ConfigStepProps = {
  values: RunConfigValues;
  onChange: (values: RunConfigValues) => void;
  onBack: () => void;
  onNext: () => void;
};

function toInt(raw: string, fallback = 0): number {
  const value = Number(raw);
  return raw === "" || !Number.isFinite(value) ? fallback : value;
}

export function ConfigStep({ values, onChange, onBack, onNext }: ConfigStepProps) {
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
      <Tabs value={values.kind} onValueChange={(kind) => patch({ kind: kind as RunKind })}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="qa">QA — escenarios con juez</TabsTrigger>
          <TabsTrigger value="stress">Estrés — carga sintética</TabsTrigger>
        </TabsList>
      </Tabs>

      {values.kind === "qa" ? (
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
        <ul className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
          {errors.map((error) => (
            <li key={error} className="flex items-start gap-1.5">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </li>
          ))}
        </ul>
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
