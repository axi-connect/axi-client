"use client";

import { ChevronDown, DoorOpen, UserRound } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { spring } from "@/core/styles/motion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import type { FunnelDTO } from "@/modules/analytics/domain/analytics";

type StageRow = {
  key: string;
  label: string;
  value: number;
  /** Texto extra a la derecha (revenue en "Pedidos pagados"). */
  suffix?: string;
  /** Etapa estrella: borde brand. */
  highlight?: boolean;
};

/** % de conversión entre etapas consecutivas (client-side, plan §2.1). */
function stepPct(from: number, to: number): number | null {
  if (from <= 0) return null;
  return Math.round((to / from) * 100);
}

function Bar({
  row,
  max,
  index,
  reduced,
}: {
  row: StageRow;
  max: number;
  index: number;
  reduced: boolean;
}) {
  const pct = max > 0 ? Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-40 shrink-0 truncate text-sm text-muted-foreground">
        {row.label}
      </span>
      <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-secondary">
        <motion.div
          role="img"
          aria-label={`${row.label}: ${row.value.toLocaleString("es-CO")}`}
          className={cn(
            "h-full rounded-lg bg-brand-gradient",
            row.highlight && "ring-2 ring-inset ring-ring",
          )}
          initial={reduced ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={reduced ? { duration: 0 } : { ...spring.soft, delay: index * 0.08 }}
        />
      </div>
      <span className="w-24 shrink-0 text-right text-sm font-semibold tabular-nums">
        {row.value.toLocaleString("es-CO")}
      </span>
      {row.suffix !== undefined && (
        <span className="hidden shrink-0 text-sm font-medium tabular-nums text-muted-foreground sm:inline">
          {row.suffix}
        </span>
      )}
    </div>
  );
}

/** Flecha de conversión entre etapas, con tooltip explicativo. */
function StepArrow({ from, to }: { from: StageRow; to: StageRow }) {
  const pct = stepPct(from.value, to.value);
  if (pct === null) return null;
  return (
    <div className="flex justify-center py-0.5 pl-40">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex cursor-default items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground">
            <ChevronDown aria-hidden className="size-3" />
            {pct} %
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {pct} % de «{from.label.toLowerCase()}» pasaron a «{to.label.toLowerCase()}»
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

/**
 * Embudo de ventas CUSTOM con divs (no Recharts): label + valor + % de
 * conversión entre etapas, rama paralela de citas y fugas clicables — barras
 * div accesibles y animables en cascada (80 ms, `spring.soft`).
 */
export function FunnelBars({
  funnel,
  onGoToQuality,
}: {
  funnel: FunnelDTO;
  /** Cross-link: clic en "Abandonadas" → tab Calidad. */
  onGoToQuality?: () => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const { stages, currency } = funnel;
  const max = stages.conversations;

  const mainStages: StageRow[] = [
    { key: "conversations", label: "Conversaciones", value: stages.conversations },
    { key: "with_intent", label: "Con intención", value: stages.with_intent },
    { key: "quoted", label: "Cotizadas", value: stages.quoted },
    { key: "orders_created", label: "Pedidos creados", value: stages.orders_created },
    { key: "orders_confirmed", label: "Pedidos confirmados", value: stages.orders_confirmed },
    {
      key: "orders_paid",
      label: "Pedidos pagados",
      value: stages.orders_paid,
      suffix: formatMoney(stages.revenue_paid_cents, currency),
      highlight: true,
    },
  ];

  const apptStages: StageRow[] = [
    { key: "appts_scheduled", label: "Citas agendadas", value: stages.appts_scheduled },
    { key: "appts_completed", label: "Citas completadas", value: stages.appts_completed },
  ];

  return (
    <div className="space-y-1">
      {mainStages.map((row, index) => (
        <div key={row.key}>
          {index > 0 && <StepArrow from={mainStages[index - 1]} to={row} />}
          <Bar row={row} max={max} index={index} reduced={reduced} />
        </div>
      ))}

      <div className="grid grid-cols-1 gap-6 pt-6 md:grid-cols-2">
        <section aria-label="Rama de citas">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Rama de citas
          </h3>
          <div className="space-y-1">
            {apptStages.map((row, index) => (
              <div key={row.key}>
                {index > 0 && <StepArrow from={apptStages[index - 1]} to={row} />}
                <Bar row={row} max={max} index={mainStages.length + index} reduced={reduced} />
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Fugas del período">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Fugas del período
          </h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>
                Escaladas a humano{" "}
                <span className="font-semibold tabular-nums">
                  {stages.escalated.toLocaleString("es-CO")}
                </span>{" "}
                {stages.escalated_ai_failures > 0 && (
                  <span className="text-destructive">
                    ({stages.escalated_ai_failures.toLocaleString("es-CO")} por fallo de la IA)
                  </span>
                )}
              </span>
            </li>
            <li>
              <button
                type="button"
                onClick={onGoToQuality}
                disabled={!onGoToQuality}
                className={cn(
                  "flex items-start gap-2 rounded-md text-left",
                  onGoToQuality &&
                    "transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <DoorOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>
                  Abandonadas{" "}
                  <span className="font-semibold tabular-nums">
                    {stages.abandoned.toLocaleString("es-CO")}
                  </span>
                  {onGoToQuality && (
                    <span className="block text-xs text-muted-foreground">
                      Ver en Calidad por qué se van →
                    </span>
                  )}
                </span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
