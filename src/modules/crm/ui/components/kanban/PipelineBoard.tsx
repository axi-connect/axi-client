"use client";

import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useAlert } from "@/core/providers/alert-provider";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { useActiveStages } from "@/modules/crm/infrastructure/hooks/use-active-stages";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { cn } from "@/core/lib/utils";
import { DealCard, type DealCardAction } from "./DealCard";
import { StageColumn } from "./StageColumn";

const COLUMN_PAGE_SIZE = 25;

/**
 * Board del pipeline sobre @dnd-kit/core (Pointer distance 6 + Touch delay
 * 180 + Keyboard, patrón orders). A diferencia de orders NO hay whitelist:
 * cualquier columna → cualquier columna es un `move` válido; el 409 lo
 * revierte el store y aquí solo se muestra el toast.
 */
export function PipelineBoard({
  canOperate,
  selectedId,
  onCardAction,
}: {
  canOperate: boolean;
  /** La oportunidad abierta en el detalle (o null): se marca y se desliza a la vista. */
  selectedId: string | null;
  onCardAction: (deal: DealDTO, action: DealCardAction) => void;
}) {
  const { showAlert } = useAlert();
  const dealsById = useBoardStore((s) => s.dealsById);
  const columns = useBoardStore((s) => s.columns);
  const highlightId = useBoardStore((s) => s.highlightId);
  const fetchColumn = useBoardStore((s) => s.fetchColumn);
  const moveDeal = useBoardStore((s) => s.moveDeal);
  const currency = useBoardStore((s) => s.stats?.currency ?? "COP");

  const [dragging, setDragging] = useState<DealDTO | null>(null);

  const sensors = useSensors(
    // distance 6: el click simple abre el rail sin iniciar drag
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const stages = useActiveStages();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Al abrir el detalle, la tarjeta abierta se desliza a la vista: el panel
  // flota sobre la derecha del tablero y la taparía (lienzo F1, tablero 4).
  useEffect(() => {
    if (selectedId === null) return;
    const card = scrollerRef.current?.querySelector<HTMLElement>(`[data-deal-id="${CSS.escape(selectedId)}"]`);
    card?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [selectedId]);

  function handleDragStart(event: DragStartEvent) {
    setDragging(dealsById[String(event.active.id)] ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const deal = dragging;
    setDragging(null);
    if (deal === null || event.over === null) return;
    const to = String(event.over.id);
    if (deal.stage_id === to) return;
    void moveDeal(deal.id, to).then((result) => {
      if (!result.ok) showAlert({ tone: "error", title: result.message });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      {/* El ÚNICO scroll horizontal del área, con la barra de marca de Axi. Con
          el detalle abierto (lg) reserva a la derecha el ancho del panel, para
          que la última columna pueda salir de debajo; `scroll-pr` hace que el
          snap y el scrollIntoView respeten ese hueco. */}
      <div
        ref={scrollerRef}
        role="region"
        aria-label="Tablero del pipeline"
        tabIndex={0}
        className={cn(
          "sidebar-scroll flex h-full min-h-0 snap-x gap-3 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 rounded-3xl",
          selectedId !== null && "lg:scroll-pr-[29rem] lg:pr-[29rem]",
        )}
      >
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            column={columns[stage.id]}
            deals={(columns[stage.id]?.ids ?? [])
              .map((id) => dealsById[id])
              .filter((deal): deal is DealDTO => deal !== undefined && deal.status === "open")}
            currency={currency}
            highlightId={highlightId}
            selectedId={selectedId}
            canOperate={canOperate}
            dragActive={dragging !== null}
            onLoadMore={() => {
              const loaded = columns[stage.id]?.ids.length ?? 0;
              void fetchColumn(stage.id, Math.floor(loaded / COLUMN_PAGE_SIZE) + 1);
            }}
            onCardAction={onCardAction}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging !== null ? (
          <div className="w-[16rem] rotate-2 rounded-2xl shadow-overlay">
            <DealCard
              deal={dragging}
              rottingDays={null}
              highlighted={false}
              canOperate={false}
              dragDisabled
              onAction={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
