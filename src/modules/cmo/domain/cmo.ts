import type { Schemas } from "@/core/api/types";

/**
 * Tipos del módulo CMO — Axel, el director de mercadeo.
 *
 * Todo deriva de `Schemas`: el contrato lo define `axi-server/openapi/openapi.json`
 * y aquí no se escribe ni una interfaz a mano. Si algo falta en estos tipos, la
 * corrección va en el backend y se regenera con `npm run api:types`.
 */

export type CmoReplyDTO = Schemas["CmoReplyDto"];
export type CmoThreadDTO = Schemas["CmoThreadListDto"]["data"][number];
export type CmoMessageDTO = Schemas["CmoTranscriptDto"]["data"][number];
export type ProposalDTO = Schemas["ProposalListDto"]["data"][number];
export type BriefingDTO = Schemas["BriefingListDto"]["data"][number];
export type DirectiveDTO = Schemas["DirectiveListDto"]["data"][number];
/**
 * Lo que devuelve el GET: los ajustes MÁS los hechos de plataforma que el cliente
 * no puede cambiar (hoy, el presupuesto de tiempo del turno).
 */
export type CmoSettingsDTO = Schemas["CmoSettingsViewDto"];
/** La forma EDITABLE, que es la que acepta el PUT como cuerpo. */
export type CmoSettingsInputDTO = Schemas["CmoSettingsDto"];
export type ApprovalResultDTO = Schemas["ApprovalResultDto"];

export type ProposalKind = ProposalDTO["kind"];
export type ProposalStatus = ProposalDTO["status"];
export type MessageRole = CmoMessageDTO["role"];
export type BriefingHighlight = BriefingDTO["highlights"][number];
export type BriefingTone = BriefingHighlight["tone"];
export type ProposalEvidence = ProposalDTO["evidence"][number];

/**
 * La pregunta con opciones que Axel deja abierta al cerrar un turno.
 *
 * Sale de `CmoMessageDTO` y no de `CmoReplyDTO` a propósito, aunque las dos
 * declaran la misma forma: el transcript es la fuente que sobrevive a una
 * recarga, así que si alguna vez divergen, la que manda es la que se puede
 * releer. `NonNullable` porque el campo es nullable en el contrato y lo que se
 * quiere nombrar es la pregunta, no su ausencia.
 */
export type CmoQuestionDTO = NonNullable<CmoMessageDTO["question"]>;

/**
 * Los topes de un mensaje a Axel: los MISMOS del servidor (`cmo.dto.ts`,
 * `min(2).max(2000)`). El compositor no deja pasarse del máximo ni enviar
 * menos del mínimo, así que el 400 de validación deja de verse.
 */
export const CMO_MESSAGE_MAX_CHARS = 2000;
export const CMO_MESSAGE_MIN_CHARS = 2;
export type CmoQuestionOption = CmoQuestionDTO["options"][number];

/** Payload de `POST /cmo/messages`. */
export type SendMessageDTO = Schemas["CmoSendMessageDto"];
/** Payload de `POST /cmo/proposals/:id/reject`. */
export type RejectProposalDTO = Schemas["RejectProposalDto"];
/** Payload de `POST /cmo/directives`. */
export type CreateDirectiveDTO = Schemas["CreateDirectiveDto"];

/**
 * Artefacto enlazado a una propuesta. El backend lo tipa como `unknown[]`
 * a propósito (§F3: su forma la fija el momento en que existan borradores), así
 * que aquí se declara la forma que el servidor SÍ escribe y se lee de forma
 * defensiva en `readArtifacts`.
 */
export interface ProposalArtifact {
  type: "campaign" | "automation" | "promotion" | "template" | "segment" | "agent_playbook";
  id: string | null;
  label: string;
  /** Solo en `agent_playbook`: el antes/después del guion de ventas. */
  before: string | null;
  after: string | null;
}

const ARTIFACT_TYPES = new Set([
  "campaign",
  "automation",
  "promotion",
  "template",
  "segment",
  "agent_playbook",
]);

/**
 * Normaliza los artefactos de una propuesta. Tolerante por diseño: un artefacto
 * con forma inesperada se descarta en vez de romper la pantalla — el detalle de
 * la propuesta tiene que poder abrirse siempre, aunque un tipo futuro del
 * backend todavía no se sepa pintar.
 */
export function readArtifacts(raw: readonly unknown[]): ProposalArtifact[] {
  return raw
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
    .filter((item) => typeof item.type === "string" && ARTIFACT_TYPES.has(item.type))
    .map((item) => ({
      type: item.type as ProposalArtifact["type"],
      id: typeof item.id === "string" ? item.id : null,
      label: typeof item.label === "string" ? item.label : "Sin nombre",
      before: typeof item.before === "string" ? item.before : null,
      after: typeof item.after === "string" ? item.after : null,
    }));
}

// ------------------------------------------------- acciones preparadas (F3)

/*
 * Acciones que Axel deja PREPARADAS en el chat (F3 «Axel OS», plan §4 del
 * servidor: `docs/plans/axel_platform_agent_plan.md`). La persona las confirma
 * o descarta con una tarjeta; nada se escribe sin ese toque.
 *
 * Excepción declarada a la regla de este archivo: estos tipos van ESCRITOS A
 * MANO, 1:1 en snake_case con el contrato del servidor
 * (`assistant/presentation/dto/assistant_action.dto.ts` y `cmo.dto.ts`),
 * porque el schema OpenAPI del cliente aún no los trae.
 * TODO(axel-os F3): al regenerar con `npm run api:types`, pasar a
 * `Schemas["AssistantActionDto"]`, `Schemas["AssistantActionDecisionDto"]` y
 * `Schemas["CmoReplyDto"]["pending_actions"][number]`, y borrar `readPendingActions`.
 */

/** R1 = `write` (interno y reversible, un toque) · R2 = `external` (llega al cliente final o cuesta). */
export type ActionRisk = "write" | "external";
export type ActionStatus = "pending" | "executed" | "failed" | "rejected" | "expired";
export type ActionOutcome =
  | "executed"
  | "failed"
  | "rejected"
  | "not_pending"
  | "expired"
  | "forbidden"
  | "not_found";

/** Lo que trae `POST /cmo/messages` en `pending_actions`: la referencia, sin el diff. */
export interface PendingActionRef {
  id: string;
  tool: string;
  risk: ActionRisk;
  summary: string;
  /** La app conectada que la pidió; `null`/ausente = el chat de Axel. */
  origin?: string | null;
}

/** El nombre que la tarjeta muestra para una acción pedida desde una app conectada. */
export function actionOrigin(door: "panel" | "mcp" | undefined, label: string | null | undefined): string | null {
  if (door !== "mcp") return null;
  const name = label?.trim();
  return name === undefined || name === "" ? "una app conectada" : name;
}

/** Una línea del diff de la vista previa: `before` es `null` cuando el valor es nuevo. */
export interface ActionPreviewLine {
  label: string;
  before: string | null;
  after: string;
}

/** `GET /assistant/actions` → `data[number]`. */
export interface AssistantActionDTO {
  id: string;
  assistant: string;
  /** `panel` = el chat de Axel; `mcp` = una app conectada (Claude…). */
  door: "panel" | "mcp";
  /** Puerta `mcp`: el nombre de la app que la pidió. */
  origin_label: string | null;
  thread_id: string | null;
  tool: string;
  risk: ActionRisk;
  status: ActionStatus;
  preview: {
    summary: string;
    lines: ActionPreviewLine[] | null;
    effects: string[] | null;
  };
  /** El resultado si se ejecutó, o el motivo si falló. */
  outcome_text: string | null;
  expires_at: string;
  decided_at: string | null;
  created_at: string;
}

/** `POST /assistant/actions/:id/confirm|reject`. */
export interface ActionDecisionDTO {
  action_id: string;
  outcome: ActionOutcome;
  text: string | null;
}

/**
 * Las acciones preparadas de una respuesta de Axel. Tolerante: hasta regenerar
 * los tipos, `CmoReplyDTO` no declara el campo, y un servidor anterior a F3 no
 * lo manda.
 */
export function readPendingActions(reply: CmoReplyDTO): PendingActionRef[] {
  const raw = (reply as CmoReplyDTO & { pending_actions?: unknown }).pending_actions;
  return Array.isArray(raw) ? (raw as PendingActionRef[]) : [];
}
