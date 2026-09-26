"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { LoaderCircle, RotateCcw } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { formatMillions } from "@/core/lib/format";
import type { BoardColumnDTO, DealDTO } from "@/modules/crm/domain/deal";
import type { ColumnState } from "@/modules/crm/infrastructure/stores/board.store";
import { Button } from "@/shared/components/ui/button";

import { DealCard, type DealCardAction } from "./DealCard";

type StageColumnProps = {
  stage: BoardColumnDTO["stage"];
  column: ColumnState | undefined;
  deals: DealDTO[];
  currency: string;
  highlightId: string | null;
  selectedId: string | null;
  canOperate: boolean;
  /** Hay un drag en curso: toda columna distinta a la de origen es un destino válido. */
  dragActive: boolean;
  onLoadMore: () => void;
  onCardAction: (deal: DealDTO, action: DealCardAction) => void;
};

/**
 * Columna droppable del pipeline (lienzo CRM premium F1). El color de la etapa
 * vive en el punto, nunca en una barra ni en el fondo. La cabecera no scrollea;
 * el cuerpo es el ÚNICO scroller de la columna, de bloque (`space-y`, no
 * `flex-col`: un hijo con `overflow-hidden` en un scroller flex se aplasta,
 * DESIGN-SYSTEM §4.2) y con la barra de marca de Axi.
 */
export function StageColumn({
  stage,
  column,
  deals,
  currency,
  highlightId,
  selectedId,
  canOperate,
  dragActive,
  onLoadMore,
  onCardAction,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = column?.total ?? deals.length;
  const remaining = Math.max(0, total - deals.length);

  return (
    <section
      ref={setNodeRef}
      aria-label={`Etapa ${stage.name}, ${total} ${total === 1 ? "oportunidad" : "oportunidades"}`}
      className={cn(
        "flex h-full w-[17rem] shrink-0 snap-start flex-col overflow-hidden rounded-3xl bg-foreground/[0.03] transition-shadow",
        dragActive && "ring-1 ring-border",
        dragActive && isOver && "ring-2 ring-foreground/60",
      )}
    >
      <header className="flex shrink-0 flex-col gap-0.5 px-4 pt-3.5 pb-2">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-full bg-muted-foreground"
              style={stage.color ? { backgroundColor: stage.color } : undefined}
            />
            <span className="truncate" title={stage.name}>
              {stage.name}
            </span>
            <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{stage.probability_pct} %</span>
          </h2>
          <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">{total}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground tabular-nums">
          {formatMillions(column?.total_value_cents ?? 0, currency)}
        </p>
      </header>

      <div className="sidebar-scroll min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-y-contain px-3 pb-3">
        {column?.error != null && (
          <div role="alert" className="flex items-start gap-2 rounded-2xl border border-border bg-card p-3 text-xs">
            <span className="min-w-0 flex-1 text-pretty">No cargaron estas oportunidades.</span>
            <button
              type="button"
              onClick={onLoadMore}
              className="inline-flex min-h-6 shrink-0 items-center gap-1 font-medium underline-offset-4 hover:underline"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reintentar
            </button>
          </div>
        )}
        <AnimatePresence initial={false}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              rottingDays={stage.rotting_days}
              highlighted={highlightId === deal.id}
              selected={selectedId === deal.id}
              canOperate={canOperate}
              onAction={onCardAction}
            />
          ))}
        </AnimatePresence>
        {deals.length === 0 && !column?.loading && column?.error == null && (
          <div className="rounded-2xl border border-dashed border-border px-3 py-5 text-center text-xs text-pretty text-muted-foreground">
            Nada en esta etapa.
            {canOperate && <span className="block">Arrastra una tarjeta aquí.</span>}
          </div>
        )}
        {column?.loading && (
          <div role="status" aria-label="Cargando" className="flex justify-center py-2">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {column?.hasMore && !column.loading && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-full rounded-full border border-dashed border-border text-xs text-muted-foreground"
            onClick={onLoadMore}
          >
            {remaining > 0 ? `Ver ${Math.min(remaining, 25)} más` : "Ver más"}
          </Button>
        )}
      </div>
    </section>
  );
}
