import type { DealStatus } from "./deal";

/**
 * Máquina de estados del deal (espejo del backend, que SIEMPRE revalida):
 * `open ─win→ won`, `open ─lose→ lost`, `won|lost ─reopen→ open`.
 * Won/lost son STATUS, no etapas: el kanban solo pinta deals `open` y sus
 * columnas son las stages dinámicas del pipeline (no hay DRAG_ACTIONS —
 * cualquier columna → cualquier columna es un `move` válido).
 */
export const DEAL_TRANSITIONS: Record<DealStatus, readonly DealStatus[]> = {
  open: ["won", "lost"],
  won: ["open"],
  lost: ["open"],
};

export function canTransition(from: DealStatus, to: DealStatus): boolean {
  return DEAL_TRANSITIONS[from].includes(to);
}

/** Won y lost son terminales: solo salen vía reopen. */
export function isTerminal(status: DealStatus): boolean {
  return status !== "open";
}

const MS_PER_DAY = 86_400_000;

/** Días completos que el deal lleva en su etapa actual. */
export function daysInStage(stageEnteredAt: string, now: Date = new Date()): number {
  const entered = new Date(stageEnteredAt).getTime();
  if (!Number.isFinite(entered)) return 0;
  return Math.max(0, Math.floor((now.getTime() - entered) / MS_PER_DAY));
}

/**
 * Estancamiento derivado en cliente (el DTO no expone `stalled_notified_at`):
 * un deal OPEN está estancado si lleva en su etapa más de `rotting_days`.
 * `rotting_days` viene del stage del board (o del PipelineDto en memoria);
 * null = la etapa no expira. El evento WS `crm.deal_stalled` solo refuerza.
 */
export function isStalled(
  deal: { status: DealStatus; stage_entered_at: string },
  rottingDays: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (deal.status !== "open") return false;
  if (rottingDays === null || rottingDays === undefined || rottingDays <= 0) return false;
  return daysInStage(deal.stage_entered_at, now) >= rottingDays;
}
