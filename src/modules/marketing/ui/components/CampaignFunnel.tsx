"use client";

import { ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { spring } from "@/core/styles/motion";
import { formatMoney } from "@/core/lib/format";
import type { CampaignStatsDTO } from "@/modules/marketing/domain/campaign";
import { campaignFunnel, stagePct } from "@/modules/marketing/domain/campaign-funnel";

/**
 * Embudo de la campaña con divs animados, no con Recharts: son cinco barras y
 * cargar una librería de charts en esta ruta costaría más que dibujarlas.
 * Molde: `analytics/ui/components/charts/FunnelBars.tsx`.
 *
 * La cascada respeta `prefers-reduced-motion`: sin ella las barras aparecen ya
 * colocadas en vez de animarse.
 */
export function CampaignFunnel({ stats }: { stats: CampaignStatsDTO }) {
  const reduced = useReducedMotion() ?? false;
  const stages = campaignFunnel(stats);
  const max = stages[0].value;

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-5">
      <h2 className="mb-4 text-sm font-semibold">Embudo</h2>

      <div className="space-y-1">
        {stages.map((stage, index) => {
          const previous = index > 0 ? stages[index - 1] : null;
          const pct = previous ? stagePct(previous.value, stage.value) : null;
          const width = max > 0 ? Math.max((stage.value / max) * 100, stage.value > 0 ? 2 : 0) : 0;
          const isLast = index === stages.length - 1;

          return (
            <div key={stage.key}>
              {pct !== null && (
                <div className="flex items-center gap-1 py-0.5 pl-0 text-xs text-muted-foreground sm:pl-36">
                  <ChevronDown aria-hidden="true" className="size-3" />
                  <span className="tabular-nums">{pct} %</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                {/* En móvil la barra desaparece, así que la etiqueta cede el
                    ancho al número: un embudo sin cifras no dice nada. */}
                <span className="min-w-0 flex-1 text-sm text-muted-foreground sm:w-36 sm:flex-none sm:shrink-0">
                  {stage.label}
                </span>
                <div className="relative hidden h-7 flex-1 overflow-hidden rounded-lg bg-secondary sm:block">
                  <motion.div
                    role="img"
                    aria-label={`${stage.label}: ${stage.value.toLocaleString("es-CO")}`}
                    // Ámbar, el acento del módulo — NO el coral de marca. El
                    // coral es solo de acción (DESIGN §3.1) y aquí convive con
                    // «Pausar» y «Cancelar»: cuatro barras corales al lado de
                    // los botones dejarían de significar «púlsame». La última
                    // etapa va sólida porque es la que trae el dinero.
                    className={
                      isLast
                        ? "h-full rounded-lg bg-accent-amber"
                        : "h-full rounded-lg bg-accent-amber/55"
                    }
                    initial={reduced ? false : { width: 0 }}
                    animate={{ width: `${width}%` }}
                    transition={reduced ? { duration: 0 } : { ...spring.soft, delay: index * 0.08 }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
                  {stage.value.toLocaleString("es-CO")}
                </span>
                {isLast && stats.revenue_cents > 0 && (
                  <span className="shrink-0 text-sm font-medium tabular-nums text-accent-amber">
                    {formatMoney(stats.revenue_cents)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {stages[2].hint} {stages[4].hint}
      </p>
    </section>
  );
}
