"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { formatMoney } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import type { DealDTO } from "@/modules/crm/domain/deal";
import type { BoardColumnDTO } from "@/modules/crm/domain/deal";
import type { ColumnState } from "@/modules/crm/infrastructure/stores/board.store";
import { DealCard, type DealCardAction } from "./DealCard";

type StageColumnProps = {
  stage: BoardColumnDTO["stage"];
  column: ColumnState;
  deals: DealDTO[];
  currency: string;
  highlightId: string | null;
  canOperate: boolean;
  /** null = sin drag activo. Toda columna distinta a la origen es válida. */
  dragActive: boolean;
  onLoadMore: () => void;
  onCardAction: (deal: DealDTO, action: DealCardAction) => void;
};

/**
 * Columna droppable del pipeline. El acento de `stage.color` va como barra
 * superior (nunca fondo saturado); header con nombre · probabilidad · count
 * y el valor agregado de la etapa en tabular-nums.
 */
export function StageColumn({
  stage,
  column,
  deals,
  currency,
  highlightId,
  canOperate,
  dragActive,
  onLoadMore,
  onCardAction,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  return (
    <section
      ref={setNodeRef}
      aria-label={`Etapa ${stage.name}`}
      className={cn(
        "flex h-full w-72 shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-secondary/50 transition-shadow",
        dragActive && isOver && "ring-2 ring-ring",
      )}
    >
      <span
        aria-hidden
        className="h-1 w-full shrink-0"
        style={stage.color ? { backgroundColor: stage.color } : undefined}
      />
      <header className="px-4 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {stage.name}
            <span className="ml-1.5 font-normal normal-case">{stage.probability_pct}%</span>
          </h2>
          <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
            {column.total}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
          {formatMoney(column.total_value_cents, currency)}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3 pb-3">
        {column.error !== null && (
          <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{column.error}</p>
        )}

        <AnimatePresence initial={false}>
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              rottingDays={stage.rotting_days}
              highlighted={highlightId === deal.id}
              canOperate={canOperate}
              onAction={onCardAction}
            />
          ))}
        </AnimatePresence>

        {deals.length === 0 && !column.loading && column.error === null && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Sin oportunidades
          </div>
        )}

        {column.loading && (
          <div role="status" aria-label="Cargando" className="flex justify-center py-2">
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {column.hasMore && !column.loading && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onLoadMore}>
            Cargar más
          </Button>
        )}
      </div>
    </section>
  );
}
