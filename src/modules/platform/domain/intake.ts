/**
 * Tipos de la consola de puesta en marcha conversacional.
 * Derivados del contrato generado (`ApiPaths`): la fuente de verdad es
 * `openapi/openapi.json`, no esta declaración.
 */
import type { ApiPaths } from "@/core/api/types";

type Get<P extends keyof ApiPaths, M extends keyof ApiPaths[P]> = ApiPaths[P][M] extends {
  responses: { 200: { content: { "application/json": infer R } } };
}
  ? R
  : never;

export type BlueprintList = Get<"/api/v1/platform/intake/blueprints", "get">;
export type Blueprint = BlueprintList["data"][number];
export type BlueprintTopic = Blueprint["topics"][number];
export type BlueprintField = BlueprintTopic["fields"][number];

export type SessionList = Get<"/api/v1/platform/intake/sessions", "get">;
export type SessionRow = SessionList["data"][number];
export type SessionDetail = Get<"/api/v1/platform/intake/sessions/{id}", "get">;
export type ApplyPlan = Get<"/api/v1/platform/intake/sessions/{id}/apply", "get">;
export type ApplyOutcome = Get<"/api/v1/platform/intake/sessions/{id}/apply", "post">;

export type SessionStatus = SessionRow["status"];

/**
 * Etiqueta y tono de cada estado.
 *
 * `Badge secondary` + un punto de color, nunca un tinte de fondo con texto del
 * mismo color: esa combinación no llega al contraste AA en tema claro.
 */
export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  pending: "Sin abrir",
  in_progress: "En curso",
  completed: "Terminada",
  applied: "Aplicada",
  cancelled: "Cancelada",
};

export const SESSION_STATUS_DOT: Record<SessionStatus, string> = {
  pending: "bg-muted-foreground/50",
  in_progress: "bg-accent-violet",
  completed: "bg-success",
  applied: "bg-primary",
  cancelled: "bg-muted-foreground/40",
};

/**
 * ¿Merece la pena mirar esta entrevista?
 *
 * Una terminada y sin aplicar es trabajo pendiente de axi; una en curso que
 * lleva días parada es una persona que se atascó. Las dos piden acción; el
 * resto es historial.
 */
export function needsAttention(row: SessionRow, now = Date.now()): boolean {
  if (row.status === "completed") return true;
  if (row.status !== "in_progress") return false;
  const last = row.last_activity_at ?? row.created_at;
  return now - new Date(last).getTime() > 48 * 3_600_000;
}

/** Cuántos campos del guion escriben de verdad en la configuración del tenant. */
export function countAppliableFields(blueprint: Blueprint): number {
  return blueprint.topics.reduce(
    (total, topic) => total + topic.fields.filter((field) => field.target !== undefined).length,
    0,
  );
}

export function countFields(blueprint: Blueprint): number {
  return blueprint.topics.reduce((total, topic) => total + topic.fields.length, 0);
}
