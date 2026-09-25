"use client";

/**
 * Las dos fichas que pedían datos nuevos del servidor (entrega premium, F6):
 * cuántas conversaciones con IA lleva la prueba, día por día en la zona del
 * negocio, y cuántos pasos de la puesta en marcha cerró.
 * Contrato: `GET …/delivery/trial-progress`.
 */
import { cn } from "@/core/lib/utils";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { SetupStepCode, TrialProgressWire } from "../../../../../infrastructure/api/delivery.dto";
import { BentoTile as SummaryTile, StatePill } from "@/shared/components/features/bento";

/** Cómo llama el panel del tenant a cada paso (OnboardingResumeBanner). */
export const SETUP_STEP_LABELS: Record<SetupStepCode, string> = {
  niche: "negocio",
  business_hours: "horario",
  catalog: "catálogo",
  agents: "agente",
  whatsapp: "WhatsApp",
};

function joinEs(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} y ${items.at(-1)}`;
}

function TileSkeleton({ label }: { label: string }) {
  return (
    <SummaryTile label={label}>
      <div role="status" aria-label={`Cargando ${label.toLowerCase()}`} className="space-y-3">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </SummaryTile>
  );
}

// ------------------------------------------------------------------ conversaciones de la prueba

export function ConversationsTile({
  usage,
  todayIndex,
  loading,
  failed = false,
}: {
  usage: TrialProgressWire["trial_usage"] | undefined;
  /** El día de hoy dentro del recorrido (0–7); null fuera de la prueba. */
  todayIndex: number | null;
  loading: boolean;
  /** La lectura falló: se dice, no se confunde con «sin prueba». */
  failed?: boolean;
}) {
  const label = "Conversaciones de prueba";
  if (loading) return <TileSkeleton label={label} />;
  if (failed) {
    return (
      <SummaryTile label={label}>
        <p className="text-sm text-muted-foreground">No pudimos leer el uso de la prueba. Recarga en un momento.</p>
      </SummaryTile>
    );
  }
  if (!usage) {
    return (
      <SummaryTile label={label}>
        <p className="text-sm font-medium">Sin prueba en curso</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Se cuentan desde que sale la bienvenida: cada conversación que atiende el agente con IA.
        </p>
      </SummaryTile>
    );
  }

  const pct = usage.allowance ? Math.min(100, Math.round((usage.used / usage.allowance) * 100)) : null;
  const max = Math.max(1, ...usage.by_day.map((day) => day.count));
  const summary = usage.by_day.map((day, index) => `día ${index}: ${day.count}`).join(", ");

  return (
    <SummaryTile
      label={label}
      aside={
        pct !== null ? (
          <StatePill tone={pct >= 90 ? "destructive" : pct >= 70 ? "warning" : "neutral"}>{pct} %</StatePill>
        ) : (
          <StatePill tone="neutral">sin tope</StatePill>
        )
      }
    >
      <p className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">{usage.used}</span>
        <span className="text-sm text-muted-foreground">
          {usage.allowance !== null ? `de ${usage.allowance.toLocaleString("es-CO")}` : "conversaciones"}
        </span>
      </p>
      <div className="mt-auto space-y-1.5">
        <div role="img" aria-label={`Conversaciones por día: ${summary}`} className="grid h-14 grid-cols-8 items-end gap-1.5">
          {usage.by_day.map((day, index) => {
            const future = todayIndex !== null && index > todayIndex;
            const today = index === todayIndex;
            return (
              <span
                key={day.date}
                aria-hidden="true"
                className={cn(
                  "block rounded-md",
                  future ? "bg-border" : today ? "bg-brand" : "bg-foreground",
                  day.count === 0 && !future && "bg-border",
                )}
                style={{ height: future || day.count === 0 ? "6px" : `${Math.max(14, Math.round((day.count / max) * 100))}%` }}
              />
            );
          })}
        </div>
        <div aria-hidden="true" className="grid grid-cols-8 gap-1.5 text-center text-[10px] text-muted-foreground tabular-nums">
          {usage.by_day.map((day, index) => (
            <span key={day.date} className={cn(index === todayIndex && "font-semibold text-foreground")}>
              {index}
            </span>
          ))}
        </div>
      </div>
    </SummaryTile>
  );
}

// ------------------------------------------------------------------ puesta en marcha

export function SetupTile({ setup, loading }: { setup: TrialProgressWire["setup"] | undefined; loading: boolean }) {
  const label = "Puesta en marcha";
  if (loading) return <TileSkeleton label={label} />;
  if (!setup) {
    return (
      <SummaryTile label={label}>
        <p className="text-sm text-muted-foreground">No pudimos leer la puesta en marcha.</p>
      </SummaryTile>
    );
  }
  const pending = setup.steps.filter((step) => step.status === "pending").map((step) => SETUP_STEP_LABELS[step.code]);
  const finished = setup.completed || pending.length === 0;
  return (
    <SummaryTile
      label={label}
      aside={finished ? <StatePill tone="success">Lista</StatePill> : undefined}
    >
      <p className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-heading text-4xl leading-none font-bold tracking-tight tabular-nums">{setup.closed}</span>
        <span className="text-sm text-muted-foreground">de {setup.total} listos</span>
      </p>
      <div className="mt-auto space-y-2">
        <ol aria-label="Pasos de la puesta en marcha" className="grid grid-cols-5 gap-1.5">
          {setup.steps.map((step) => (
            <li key={step.code}>
              <span
                aria-hidden="true"
                className={cn("block h-2 rounded-full", step.status === "pending" ? "bg-border" : "bg-foreground")}
              />
              <span className="sr-only">
                {SETUP_STEP_LABELS[step.code]}: {step.status === "done" ? "listo" : step.status === "skipped" ? "omitido" : "pendiente"}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-pretty">
          {finished ? (
            <span className="text-muted-foreground">Negocio, horario, catálogo, agente y WhatsApp</span>
          ) : (
            <>
              <span className="font-medium">Falta:</span> {joinEs(pending)}
            </>
          )}
        </p>
      </div>
    </SummaryTile>
  );
}
