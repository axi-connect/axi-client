"use client";

import { useMemo, useState } from "react";
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
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
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
  onCardAction,
}: {
  canOperate: boolean;
  onCardAction: (deal: DealDTO, action: DealCardAction) => void;
}) {
  const { showAlert } = useAlert();
  const dealsById = useBoardStore((s) => s.dealsById);
  const columns = useBoardStore((s) => s.columns);
  const stageOrder = useBoardStore((s) => s.stageOrder);
  const pipelines = useBoardStore((s) => s.pipelines);
  const pipelineId = useBoardStore((s) => s.pipelineId);
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

  const stages = useMemo(() => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    return stageOrder
      .map((stageId) => pipeline?.stages.find((stage) => stage.id === stageId))
      .filter((stage): stage is NonNullable<typeof stage> => stage !== undefined);
  }, [pipelines, pipelineId, stageOrder]);

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
      if (!result.ok) showAlert({ tone: "error", title: result.message, open: true });
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex h-full min-h-0 snap-x gap-3 overflow-x-auto pb-1">
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
          <div className="w-64 rotate-2 shadow-overlay">
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
