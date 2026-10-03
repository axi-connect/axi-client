"use client";

import { useState } from "react";
import { ChevronDown, History, X } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { StatePillTone } from "@/shared/components/features/bento";
import { SegmentedControl } from "@/shared/components/ui/segmented";

import { itemTitle, RUN_STAGE_LABELS, RUN_STAGES, type Routine, type RunEvent, type RunItem, type RunStage } from "../../domain/autopilot";
import { eventLine } from "../../domain/copy";
import { reasonLabel, reasonStop } from "../../domain/reasons";
import type { StopKey, TrajectoryStop } from "../../domain/trajectory";
import { StatusDot } from "./StatusDot";

/** Cuántas se ven antes de «Ver las N». */
const FIRST_PAGE = 10;

const STAGE_TONE: Record<RunStage, StatePillTone> = {
  searching: "info",
  enriching: "info",
  qualifying: "info",
  contacting: "info",
  following: "info",
  replied: "success",
  demo: "success",
  discarded: "neutral",
};

/** El nombre corto de una etapa en el filtro: «Se quedaron», no «Se quedó en el camino». */
const SEGMENT_LABEL: Partial<Record<RunStage, string>> = { discarded: "Se quedaron" };

/** Hasta qué parada llegó una cuenta: por su etapa, o por la parada por donde salió. */
function reachedStop(item: RunItem, stops: readonly TrajectoryStop[]): number {
  const keys = stops.map((stop) => stop.key);
  const index = (key: StopKey) => keys.indexOf(key);
  switch (item.stage) {
    case "searching":
      return index("search");
    case "enriching":
      return index("enrich");
    case "qualifying":
      return index("qualify");
    case "contacting":
      return item.decision === null && index("approve") >= 0 ? index("approve") : index("contact");
    case "following":
    case "replied":
    case "demo":
      return keys.length - 1;
    case "discarded": {
      const at = reasonStop(item.reason);
      return at === null ? -1 : index(at);
    }
  }
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/**
 * «Cuentas de esta salida» (R1): todas las cuentas con su etapa, filtrables
 * por etapa (Se quedaron incluidas) y por la parada que se toque en el mapa
 * («Llegaron a «X» · N»), con el motivo en palabras. Con un lote esperando
 * abre en «Se quedaron»: las del lote ya están en la isla. Debajo, «Paso a
 * paso», plegado, con cada línea de la bitácora.
 */
export function RunAccounts({
  items,
  routine,
  stops,
  events,
  waiting,
  batchSize,
  selectedStop,
  onClearStop,
  failed,
}: {
  items: readonly RunItem[];
  routine: Pick<Routine, "qualify" | "source"> | null;
  stops: readonly TrajectoryStop[];
  events: readonly RunEvent[];
  waiting: boolean;
  batchSize: number;
  selectedStop: StopKey | null;
  onClearStop: () => void;
  failed: boolean;
}) {
  const [filter, setFilter] = useState<RunStage | "all" | "auto">("auto");
  const [expanded, setExpanded] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const selectedIndex = selectedStop === null ? -1 : stops.findIndex((stop) => stop.key === selectedStop);
  const reached = selectedIndex < 0 ? items : items.filter((item) => reachedStop(item, stops) >= selectedIndex);
  const effective = filter === "auto" ? (waiting && items.some((item) => item.stage === "discarded") ? "discarded" : "all") : filter;
  const count = (stage: RunStage) => reached.filter((item) => item.stage === stage).length;
  const stages = RUN_STAGES.filter((stage) => count(stage) > 0 || stage === effective);
  // Las que siguen van primero; las que se quedaron, al final.
  const shown = (effective === "all" ? reached : reached.filter((item) => item.stage === effective))
    .slice()
    .sort((a, b) => Number(a.stage === "discarded") - Number(b.stage === "discarded"));
  const visible = expanded ? shown : shown.slice(0, FIRST_PAGE);
  const selectedLabel = selectedIndex < 0 ? null : (stops[selectedIndex]?.label ?? null);

  function choose(next: RunStage | "all") {
    setFilter(next);
    setExpanded(false);
  }

  return (
    <section aria-labelledby="run-accounts-title" className="bg-card border-border flex min-w-0 flex-col rounded-3xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="run-accounts-title" className="text-base font-semibold">
          Cuentas de esta salida
        </h2>
        {items.length > 0 && (
          <SegmentedControl
            label="Filtrar por etapa"
            size="sm"
            surface="inline"
            value={effective}
            onValueChange={(value) => choose(value)}
            items={[
              { value: "all", label: "Todas", count: reached.length },
              ...stages.map((stage) => ({ value: stage, label: SEGMENT_LABEL[stage] ?? RUN_STAGE_LABELS[stage], count: count(stage) })),
            ]}
          />
        )}
      </div>

      {selectedLabel !== null && (
        <span className="bg-muted mt-3 inline-flex w-fit items-center gap-1.5 rounded-full py-1 pr-1 pl-3 text-[12.5px] font-medium">
          Llegaron a «{selectedLabel}» · {String(reached.length)}
          <button
            type="button"
            onClick={onClearStop}
            aria-label="Quitar el filtro de la parada"
            className="hover:bg-foreground/10 focus-visible:outline-ring grid size-6 place-items-center rounded-full focus-visible:outline-2"
          >
            <X aria-hidden className="size-3" />
          </button>
        </span>
      )}
      {waiting && effective === "discarded" ? (
        <p className="text-muted-foreground mt-2.5 text-[12.5px] text-pretty">
          {batchSize === 1 ? "La que espera tu aprobación está en la isla." : `Las ${String(batchSize)} por aprobar están en la isla.`} Aquí, las que se quedaron en el camino y por qué.
        </p>
      ) : (
        selectedLabel === null &&
        items.length > 0 && <p className="text-muted-foreground mt-2.5 text-[12.5px]">Toca una parada del mapa para ver solo las que llegaron ahí.</p>
      )}

      {visible.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-[13px]">
          {items.length === 0
            ? failed
              ? "Esta salida no alcanzó a traer cuentas."
              : "Todavía no hay cuentas en esta salida."
            : "Todavía no hay cuentas en esta etapa."}
        </p>
      ) : (
        <ul className="divide-border mt-3 flex flex-col divide-y">
          {visible.map((item) => {
            const sub = [
              item.score === null ? null : `Puntaje ${String(item.score)}`,
              item.reason === null ? null : reasonLabel(item.reason, routine ?? undefined),
            ].filter((part): part is string => part !== null);
            return (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5">
                <span className="min-w-0">
                  <b className="block text-[13.5px] font-medium break-words">{itemTitle(item)}</b>
                  {sub.length > 0 && <span className="text-muted-foreground block text-xs text-pretty">{sub.join(" · ")}</span>}
                </span>
                {effective === "all" && <StatusDot tone={STAGE_TONE[item.stage]}>{RUN_STAGE_LABELS[item.stage]}</StatusDot>}
              </li>
            );
          })}
        </ul>
      )}
      {!expanded && shown.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="focus-visible:outline-ring mt-3 inline-flex min-h-6 w-fit items-center gap-1.5 rounded-md text-[13.5px] font-medium underline-offset-4 hover:underline focus-visible:outline-2"
        >
          Ver las {String(shown.length)}
          <ChevronDown aria-hidden className="size-3.5" />
        </button>
      )}

      <details className="group border-border mt-4 border-t pt-3" onToggle={(event) => setLogOpen(event.currentTarget.open)}>
        <summary className="focus-visible:outline-ring flex cursor-pointer list-none items-center gap-2 rounded-md text-[13.5px] font-medium focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
          <History aria-hidden className="size-[15px]" />
          Paso a paso
          <span className="text-muted-foreground font-normal">
            · {String(events.length)} {events.length === 1 ? "línea" : "líneas"}
          </span>
          <ChevronDown aria-hidden className="ml-auto size-[15px] transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        {/* Las líneas se montan al abrirlo: plegado no pesa ni ocupa. */}
        {!logOpen ? null : events.length === 0 ? (
          <p className="text-muted-foreground mt-2.5 text-sm">Todavía no pasó nada.</p>
        ) : (
          <ol className="mt-2.5 flex flex-col">
            {events.map((event) => (
              <li key={event.id} className={cn("border-border grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2.5 border-t border-dashed py-1.5 text-[13px] first:border-t-0")}>
                <span className="text-muted-foreground font-mono text-xs tabular-nums">{timeOf(event.created_at)}</span>
                <span className="min-w-0 text-pretty">{eventLine(event, routine ?? undefined)}</span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </section>
  );
}
