"use client";

/**
 * Paso 3 · Revisión: resumen del borrador + errores de negocio del POST con
 * su `details` legible (helpers del dominio). Si el rechazo es
 * `no_pricing`, ofrece cambiar a modo mock con un click.
 */
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { STRESS_BUDGET_S } from "../../../../../domain/quality-runs";
import { configOccupancySeconds, type RunConfigValues } from "./run-config";

export type SubmitErrorInfo = {
  message: string;
  /** 422 spend_cap_exceeded con reason no_pricing → CTA "usar mock". */
  suggestMock: boolean;
  /** 409 run_already_active → CTA "ver ejecuciones". */
  alreadyActive: boolean;
} | null;

type ReviewStepProps = {
  companyName: string;
  agentName: string;
  values: RunConfigValues;
  suiteName: string | null;
  submitError: SubmitErrorInfo;
  pending: boolean;
  onBack: () => void;
  onSubmit: () => void;
  onUseMock: () => void;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ReviewStep({
  companyName,
  agentName,
  values,
  suiteName,
  submitError,
  pending,
  onBack,
  onSubmit,
  onUseMock,
}: ReviewStepProps) {
  const occupancy = Math.round(configOccupancySeconds(values));

  return (
    <div className="space-y-5">
      <dl className="divide-y divide-border rounded-xl border border-border px-4 py-1">
        <Row label="Tenant">{companyName}</Row>
        <Row label="Agente objetivo">{agentName}</Row>
        <Row label="Tipo">{values.kind === "qa" ? "QA — escenarios con juez" : "Estrés — carga sintética"}</Row>
        {values.kind === "qa" ? (
          <>
            <Row label="Alcance">
              {values.qaMode === "suite"
                ? suiteName ?? "Suite"
                : `${values.scenarioIds.length} ${values.scenarioIds.length === 1 ? "escenario" : "escenarios"}`}
            </Row>
            <Row label="Concurrencia">{values.concurrency}</Row>
          </>
        ) : (
          <>
            <Row label="Modo IA">{values.aiMode === "mock" ? "Mock ($0, sin tool_calls)" : "Real (consume LLM)"}</Row>
            <Row label="Carga">
              {values.conversations} conv × {values.turnsPerConversation} turnos
            </Row>
            <Row label="Latencia mock">{values.mockLatencyMs} ms</Row>
            <Row label="Ocupación estimada">
              <span className="tabular-nums">
                {occupancy} s / {STRESS_BUDGET_S} s
              </span>
            </Row>
            {values.aiMode === "real" && <Row label="Tope de gasto">{values.spendCapUsd} USD</Row>}
          </>
        )}
      </dl>

      <p className="text-xs text-muted-foreground">
        Los datos generados son sintéticos, quedan marcados como simulados y puedes purgarlos al terminar
        (retención automática de 14 días). El consumo de IA se factura a plataforma, nunca al tenant.
      </p>

      {submitError && (
        <div
          className="space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          role="alert"
        >
          <p className="flex items-start gap-2">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {submitError.message}
          </p>
          {submitError.suggestMock && (
            <Button size="sm" variant="outline" onClick={onUseMock}>
              Cambiar a modo mock ($0)
            </Button>
          )}
          {submitError.alreadyActive && (
            <Button size="sm" variant="outline" asChild>
              <Link href="/platform/quality/runs" prefetch={false}>
                Ver la ejecución activa
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" onClick={onBack} disabled={pending}>
          Atrás
        </Button>
        <Button onClick={onSubmit} disabled={pending}>
          {pending ? "Creando…" : "Crear ejecución"}
        </Button>
      </div>
    </div>
  );
}
