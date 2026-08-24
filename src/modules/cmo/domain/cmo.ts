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
