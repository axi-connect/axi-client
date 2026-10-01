"use client";

import { useState } from "react";

import { cn } from "@/core/lib/utils";
import { BentoTile, StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";

import { itemTitle, RUN_STAGE_LABELS, RUN_STAGES, type Routine, type RunItem, type RunStage } from "../../domain/autopilot";
import { reasonLabel } from "../../domain/reasons";

/** Cuántas se ven antes de «Ver las N». */
const FIRST_PAGE = 10;

const STAGE_TONE: Record<RunStage, StatePillTone> = {
  searching: "info",
  enriching: "info",
  qualifying: "info",
  contacting: "info",
  following: "success",
  replied: "success",
  demo: "success",
  discarded: "neutral",
};

/**
 * «Cuentas de esta ejecución» (U1): todas las cuentas con su etapa, filtrables
 * por etapa —Descartado incluida, que en los carriles no se veía— y el motivo
 * en palabras, nunca la clave. Sin scroll lateral ni tope por carril.
 */
export function RunAccounts({ items, routine }: { items: readonly RunItem[]; routine: Pick<Routine, "qualify"> | null }) {
  const [filter, setFilter] = useState<RunStage | "all">("all");
  const [expanded, setExpanded] = useState(false);
  const count = (stage: RunStage) => items.filter((item) => item.stage === stage).length;
  const stages = RUN_STAGES.filter((stage) => count(stage) > 0 || stage === filter);
  const shown = filter === "all" ? items : items.filter((item) => item.stage === filter);
  const visible = expanded ? shown : shown.slice(0, FIRST_PAGE);

  function choose(next: RunStage | "all") {
    setFilter(next);
    setExpanded(false);
  }

  return (
    <BentoTile label="Cuentas de esta ejecución">
      {items.length > 0 && (
        <div role="group" aria-label="Filtrar por etapa" className="flex flex-wrap gap-1.5">
          <FilterButton pressed={filter === "all"} onClick={() => choose("all")} label="Todas" count={items.length} />
          {stages.map((stage) => (
            <FilterButton key={stage} pressed={filter === stage} onClick={() => choose(stage)} label={RUN_STAGE_LABELS[stage]} count={count(stage)} />
          ))}
        </div>
      )}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {items.length === 0 ? "Todavía no hay cuentas en esta ejecución." : "Todavía no hay cuentas en esta etapa."}
        </p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {visible.map((item) => {
            const detail = [
              item.score === null ? null : `Puntaje ${String(item.score)}`,
              item.reason === null ? null : reasonLabel(item.reason, routine ?? undefined),
            ].filter((part): part is string => part !== null);
            return (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 py-2.5 text-sm">
                <span className="font-medium text-pretty break-words">{itemTitle(item)}</span>
                <span className="row-span-2 self-center">
                  <StatePill tone={STAGE_TONE[item.stage]}>{RUN_STAGE_LABELS[item.stage]}</StatePill>
                </span>
                {detail.length > 0 && <span className="text-muted-foreground text-xs text-pretty">{detail.join(" · ")}</span>}
              </li>
            );
          })}
        </ul>
      )}
      {!expanded && shown.length > FIRST_PAGE && (
        <Button variant="outline" size="sm" className="self-start rounded-full" onClick={() => setExpanded(true)}>
          Ver las {String(shown.length)}
        </Button>
      )}
    </BentoTile>
  );
}

function FilterButton({ pressed, onClick, label, count }: { pressed: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "focus-visible:outline-ring inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2",
        pressed ? "bg-accent text-foreground border-transparent" : "border-border bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span className="font-mono tabular-nums">{String(count)}</span>
    </button>
  );
}
