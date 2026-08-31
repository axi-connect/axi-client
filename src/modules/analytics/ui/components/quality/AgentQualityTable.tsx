"use client";

import { TriangleAlert } from "lucide-react";
import { DashboardCard } from "@/modules/dashboard/ui/components/MetricTile";
import { CardEmpty } from "@/shared/components/features/card-empty";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ScoreBadge } from "./score-badge";
import { SectionError, sectionRefetching } from "../conversion/section-states";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import type { AgentPerformanceDTO } from "@/modules/analytics/domain/analytics";

const formatPct = (value: number) =>
  `${value.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;

const formatLatency = (ms: number | null) =>
  ms === null ? "—" : `${(ms / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} s`;

/** Card "Calidad por agente": técnica (fallos/latencia) + juicio (score). */
export function AgentQualityTable({
  section,
  onRetry,
}: {
  section: Section<AgentPerformanceDTO>;
  onRetry: () => void;
}) {
  return (
    <DashboardCard title="Calidad por agente">
      {section.status === "error" ? (
        <SectionError message={section.error} onRetry={onRetry} />
      ) : section.data === null ? (
        <div role="status" aria-label="Cargando agentes" className="space-y-3">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
      ) : section.data.agents.length === 0 ? (
        <CardEmpty
          glyph="ai"
          message="Aún no tienes agentes IA con actividad en este período."
        />
      ) : (
        <div className={`overflow-x-auto ${sectionRefetching(section) ?? ""}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 font-medium">Agente</th>
                <th className="pb-2 text-right font-medium">Evals</th>
                <th className="pb-2 text-right font-medium">Score</th>
                <th className="hidden pb-2 text-right font-medium md:table-cell">
                  Fallos técn.
                </th>
                <th className="hidden pb-2 text-right font-medium md:table-cell">
                  Latencia p95
                </th>
                <th className="hidden pb-2 text-right font-medium md:table-cell">Notas voz</th>
                <th className="pb-2 text-right font-medium">Alucin. graves</th>
              </tr>
            </thead>
            <tbody>
              {section.data.agents.map((agent) => (
                <tr key={agent.agent_id} className="border-t border-border">
                  <td className="max-w-44 truncate py-2.5 pr-2 font-medium">{agent.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">
                    {agent.evaluations.toLocaleString("es-CO")}
                  </td>
                  <td className="py-2.5 text-right">
                    {agent.avg_overall_score === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <ScoreBadge score={agent.avg_overall_score} />
                    )}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatPct(agent.failure_rate_pct)}
                  </td>
                  <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatLatency(agent.latency_p95_ms)}
                  </td>
                  {/* §10.5 F5: respuestas del agente que salieron en audio;
                      "—" = agente sin voz en el período */}
                  <td className="hidden py-2.5 text-right tabular-nums text-muted-foreground md:table-cell">
                    {agent.voice_replies > 0 ? (
                      <span title={`${String(agent.voice_notes_delivered)} entregadas al cliente`}>
                        {agent.voice_replies.toLocaleString("es-CO")}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">
                    {agent.major_hallucinations > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-destructive">
                        {agent.major_hallucinations}
                        <TriangleAlert aria-hidden className="size-3.5" />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}
