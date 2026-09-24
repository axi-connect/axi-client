"use client";

import { TriangleAlert } from "lucide-react";
import type { AgentDigestDTO } from "@/modules/crm/domain/activity";
import {
  agentDigestFigures,
  agentDigestTeaser,
  hasDigestNews,
  hasTeaserNews,
} from "@/modules/crm/domain/agent-digest";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";
import { InlineFigures } from "@/shared/components/features/inline-figures";

/**
 * El parte del agente: lo único que le dice al dueño si la automatización
 * sirve para algo.
 *
 * El molde visual (eyebrow + cifras + filete de 2 px, sin caja y sin tinte) es
 * `InlineFigures`, promovido a `shared` cuando `commercial` necesitó el mismo
 * instrumento para el ritmo de la semana (P20 del plan comercial). Aquí queda
 * lo que es del CRM: qué cifras se cuentan y qué hace cada densidad.
 *
 * Dos densidades:
 * - `full` (modo agente): todas las cifras y «sin enviar» como acción.
 * - `teaser` (bandeja mezclada): dos cifras y lleva al modo agente. Existe
 *   porque quien necesita saber si la automatización sirve es justo quien
 *   nunca toca el filtro de ejecutor.
 */
export function AgentDigestLine({
  digest,
  variant,
}: {
  digest: AgentDigestDTO;
  variant: "full" | "teaser";
}) {
  const setExecutor = useTasksStore((s) => s.setExecutor);
  const setRunStatus = useTasksStore((s) => s.setRunStatus);

  const teaser = variant === "teaser";
  const counts = digest.counts;
  if (!(teaser ? hasTeaserNews(counts) : hasDigestNews(counts))) return null;

  const figures = teaser ? agentDigestTeaser(counts) : agentDigestFigures(counts);
  const eyebrow = `Tus agentes · ${digest.window === "yesterday" ? "ayer" : "hoy"}`;

  if (teaser) {
    return <InlineFigures eyebrow={eyebrow} figures={figures} onClick={() => setExecutor("agent")} />;
  }

  return (
    <InlineFigures
      eyebrow={eyebrow}
      figures={figures}
      trailing={
        // La única cifra que exige una decisión es la única con control: no
        // informa del fallo, lleva a él.
        counts.failed > 0 ? (
          <button
            type="button"
            onClick={() => setRunStatus("failed")}
            className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-xs text-muted-foreground transition-colors hover:border-destructive/45 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <TriangleAlert aria-hidden className="size-3.5 text-destructive" />
            <b className="font-semibold text-foreground tabular-nums">{counts.failed}</b>
            sin enviar
          </button>
        ) : undefined
      }
    />
  );
}
