import type { Schemas } from "@/core/api/types";
import type { DocumentTypeView } from "./template";

/**
 * Dominio de los documentos EMITIDOS (F8 Cobros): alias del contrato generado
 * y las lecturas puras que el rail y la ficha del contacto comparten.
 *
 * Un documento emitido es un hecho con número: nace `queued` con su
 * consecutivo, el worker lo pinta y pasa a `rendered`; si el pedido cambia
 * después, el papel no cambia — «desactualizado» es un dato, no una alarma.
 */
export type DocumentDTO = Schemas["DocumentDto"];
export type DocumentStatus = DocumentDTO["status"];
export type DocumentsListDTO = Schemas["DocumentsListDto"];
export type IssueDocumentResultDTO = Schemas["IssueDocumentResultDto"];
export type DocumentFileUrlDTO = Schemas["DocumentFileUrlDto"];

/** Sobre qué se emite (misma forma que `DocumentSubjectRef` en el servidor). */
export type IssueSubjectKind = Schemas["IssueDocumentDto"]["subject"]["kind"];
export type IssueSubject = { kind: IssueSubjectKind; id: string };

/** Por qué se lista: una entidad emisora, o la persona a cuyo nombre se archivó. */
export type DocumentSubject = IssueSubject | { kind: "contact"; id: string };

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  queued: "Generando…",
  rendering: "Generando…",
  rendered: "Listo",
  failed: "No se pudo generar",
  superseded: "Reemplazado",
};

/**
 * Tono del estado para la fila: `busy` late en azul mientras el worker pinta,
 * `bad` es rojo de texto (nunca fondo), `off` atenúa lo reemplazado.
 */
export type DocumentStatusTone = "ok" | "busy" | "bad" | "off";

export function documentStatusTone(status: DocumentStatus): DocumentStatusTone {
  switch (status) {
    case "rendered":
      return "ok";
    case "queued":
    case "rendering":
      return "busy";
    case "failed":
      return "bad";
    case "superseded":
      return "off";
  }
}

/** Mientras el worker pinta, la fila no ofrece acciones: solo espera. */
export function isDocumentInFlight(status: DocumentStatus): boolean {
  return status === "queued" || status === "rendering";
}

/**
 * El pedido cambió DESPUÉS de este papel. Solo aplica a lo que sigue vigente:
 * un reemplazado ya no promete nada.
 */
export function isOutdated(
  document: Pick<DocumentDTO, "status" | "created_at">,
  subjectUpdatedAt: string | null | undefined,
): boolean {
  if (!subjectUpdatedAt || document.status === "superseded") return false;
  return (
    new Date(subjectUpdatedAt).getTime() >
    new Date(document.created_at).getTime()
  );
}

/** Un render puede fallar así de RONDAS antes de que «Reintentar» deje paso a «Regenerar». */
export const MAX_RENDER_ROUNDS = 3;

export function canRetry(
  document: Pick<DocumentDTO, "status" | "attempts">,
): boolean {
  return document.status === "failed" && document.attempts < MAX_RENDER_ROUNDS;
}

/**
 * Lo que el menú «Emitir» ofrece para una entidad: SOLO los tipos que el
 * catálogo declara emitibles a mano sobre esa entidad (`issue_subject`). El
 * recibo no aparece para un pedido; nada se pinta deshabilitado.
 */
export type IssueOption = {
  type: DocumentTypeView;
  /** El documento vigente de ese tipo cuando la política es «uno por entidad». */
  existing: DocumentDTO | null;
};

export function issueOptions(
  types: readonly DocumentTypeView[],
  subject: IssueSubject,
  documents: readonly DocumentDTO[],
): IssueOption[] {
  return types
    .filter((type) => type.issuable && type.issue_subject === subject.kind)
    .map((type) => ({
      type,
      existing:
        type.issue_policy === "once"
          ? (documents.find(
              (document) =>
                document.type_code === type.code &&
                document.status !== "superseded",
            ) ?? null)
          : null,
    }));
}

/** Los documentos vigentes primero, el más reciente arriba; lo reemplazado al final. */
export function sortDocuments(
  documents: readonly DocumentDTO[],
): DocumentDTO[] {
  return [...documents].sort((a, b) => {
    const aGone = a.status === "superseded" ? 1 : 0;
    const bGone = b.status === "superseded" ? 1 : 0;
    if (aGone !== bGone) return aGone - bGone;
    return b.created_at.localeCompare(a.created_at);
  });
}
