import { useMemo } from "react";

import type { DealDTO, PipelineStageDTO } from "@/modules/crm/domain/deal";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";

/**
 * Las etapas del pipeline activo en el orden del tablero, y los deals abiertos
 * cargados. Lo comparten el tablero, el resumen («se enfrían») y el detalle
 * (recorrido e historial), para no recalcular el cruce stageOrder × pipeline en
 * cada uno.
 */
export function useActiveStages(): PipelineStageDTO[] {
  const pipelines = useBoardStore((s) => s.pipelines);
  const pipelineId = useBoardStore((s) => s.pipelineId);
  const stageOrder = useBoardStore((s) => s.stageOrder);
  return useMemo(() => {
    const pipeline = pipelines.find((p) => p.id === pipelineId);
    if (pipeline === undefined) return [];
    if (stageOrder.length === 0) return [...pipeline.stages].sort((a, b) => a.position - b.position);
    return stageOrder
      .map((stageId) => pipeline.stages.find((stage) => stage.id === stageId))
      .filter((stage): stage is PipelineStageDTO => stage !== undefined);
  }, [pipelines, pipelineId, stageOrder]);
}

export function useOpenBoardDeals(): DealDTO[] {
  const dealsById = useBoardStore((s) => s.dealsById);
  return useMemo(() => Object.values(dealsById).filter((deal) => deal.status === "open"), [dealsById]);
}
