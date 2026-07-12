/**
 * Máquina de estados del pedido (espejo de order_transitions.ts del backend).
 * TypeScript puro: la UI valida drags/menús contra esto ANTES de llamar al
 * backend (que revalida siempre).
 */
import type { OrderStatus } from "./order";

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["confirmed", "payment_reported", "cancelled"],
  confirmed: ["payment_reported", "paid", "cancelled"],
  payment_reported: ["paid", "confirmed", "pending", "cancelled"],
  paid: ["fulfilled", "cancelled"],
  fulfilled: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function isTerminal(status: OrderStatus): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

/** Columnas del tablero (drafts ocultos; cancelados solo en tabla/filtros). */
export const KANBAN_COLUMNS = [
  "pending",
  "confirmed",
  "payment_reported",
  "paid",
  "fulfilled",
] as const;

export type KanbanStatus = (typeof KANBAN_COLUMNS)[number];

export function isKanbanStatus(status: OrderStatus): status is KanbanStatus {
  return (KANBAN_COLUMNS as readonly OrderStatus[]).includes(status);
}

/**
 * Qué produce cada drop válido (whitelist v1): solo transiciones "hacia
 * adelante" con acción clara. Retrocesos y cancelar van por menú/detalle
 * (los retrocesos los produce el backend al rechazar un pago).
 * - `report_payment` y `verify_payment` no transicionan directo: abren el
 *   flujo correspondiente (registrar pago / verificar el pago reportado).
 */
export type DragAction = "confirm" | "report_payment" | "verify_payment" | "fulfill";

export const DRAG_ACTIONS: Partial<Record<`${KanbanStatus}->${KanbanStatus}`, DragAction>> = {
  "pending->confirmed": "confirm",
  "confirmed->payment_reported": "report_payment",
  "payment_reported->paid": "verify_payment",
  "paid->fulfilled": "fulfill",
};

export function dragActionFor(from: KanbanStatus, to: KanbanStatus): DragAction | null {
  return DRAG_ACTIONS[`${from}->${to}`] ?? null;
}

/** Etiquetas ES de estado (una sola fuente para badges, columnas y filtros). */
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  draft: "Borrador",
  pending: "Pendiente",
  confirmed: "Confirmado",
  payment_reported: "Pago reportado",
  paid: "Pagado",
  fulfilled: "Entregado",
  cancelled: "Cancelado",
};
