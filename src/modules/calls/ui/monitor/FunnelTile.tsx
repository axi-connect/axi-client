"use client";

import { useState } from "react";
import { BentoLink, BentoTile } from "@/shared/components/features/bento";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { cn } from "@/core/lib/utils";
import { biggestDrop, type CallsFunnelDTO, type ProactiveCallType } from "@/modules/calls/domain/playbooks";

/** Nombres cortos del selector: caben en la ficha a 375 px. */
const SHORT: Record<ProactiveCallType, string> = {
  appointment_reminder: "Recordatorio",
  sales_followup: "Venta",
  collections: "Cobranza",
  reactivation: "Reactivación",
  followup: "Seguimiento",
};

/**
 * «Dónde se caen las llamadas» (plan de modos §4, canvas del Monitoreo): por
 * tipo, cuántas proactivas contestadas llegaron a cada etapa del marco en el
 * ciclo. Voz del progreso (DESIGN §7.1): cuántas llegaron, dónde se quedaron
 * más y qué sigue — nunca un porcentaje negativo. Solo los tipos con
 * llamadas; sin ninguna, lo dice con calma.
 */
export function FunnelTile({ funnel, className }: { funnel: CallsFunnelDTO; className?: string }) {
  const withCalls = funnel.types.filter((type) => type.total > 0);
  const [selected, setSelected] = useState<string | null>(null);
  const active = withCalls.find((type) => type.call_type === selected) ?? withCalls[0] ?? null;

  if (active === null) {
    return (
      <BentoTile label="Dónde se caen las llamadas" className={className}>
        <p className="text-sm text-muted-foreground">
          Aún no hay llamadas proactivas contestadas en este ciclo. Cuando las haya, aquí verás hasta qué etapa
          llega cada tipo y dónde se quedan.
        </p>
        <BentoLink href="/calls/playbooks">Ver los marcos</BentoLink>
      </BentoTile>
    );
  }

  const top = active.stages[0]?.reached ?? active.total;
  const drop = biggestDrop(active);
  const last = active.stages.at(-1);
  return (
    <BentoTile
      label="Dónde se caen las llamadas"
      aside={
        withCalls.length > 1 ? (
          <SegmentedControl
            value={active.call_type}
            onValueChange={setSelected}
            label="Tipo de llamada"
            size="sm"
            surface="inline"
            items={withCalls.map((type) => ({
              value: type.call_type,
              label: SHORT[type.call_type as ProactiveCallType] ?? type.label,
            }))}
          />
        ) : undefined
      }
      className={className}
    >
      <p className="max-w-prose text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {active.goal_met} de {active.total} cumplieron su objetivo
        </span>
        {drop !== null
          ? ` · ${drop.lost} se quedaron entre ${drop.from.toLowerCase()} y ${drop.to.toLowerCase()} · lo que sigue es revisar esa etapa del marco.`
          : last !== undefined
            ? ` · todas llegaron hasta ${last.label.toLowerCase()}.`
            : "."}
      </p>
      <ol className="flex flex-col gap-1.5" aria-label={`Etapas de ${active.label}`}>
        {active.stages.map((stage, index) => {
          const pct = top === 0 ? 0 : Math.round((stage.reached / top) * 100);
          const isDrop = drop !== null && stage.label === drop.to;
          const isLast = index === active.stages.length - 1;
          return (
            <li
              key={stage.key}
              className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm sm:grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto]"
            >
              <span className={cn("truncate", isDrop && "font-medium")}>{stage.label}</span>
              <span aria-hidden className="relative h-5 overflow-hidden rounded-md bg-muted">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-md",
                    isDrop ? "bg-accent-amber" : isLast ? "bg-success" : "bg-accent-violet/80",
                  )}
                  style={{ width: `${String(pct)}%` }}
                />
              </span>
              <span className="text-right text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                <span className="font-semibold text-foreground">{stage.reached}</span> · {pct} %
              </span>
            </li>
          );
        })}
      </ol>
    </BentoTile>
  );
}
