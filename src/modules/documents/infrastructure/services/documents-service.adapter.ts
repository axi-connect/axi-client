import { http } from "@/core/services/http";
import type {
  DocumentPreviewDTO,
  DocumentTemplateDTO,
  DocumentTypesDTO,
  DocumentsSettingsDTO,
  TemplateDocument,
  UpdateDocumentsSettingsDTO,
} from "@/modules/documents/domain/template";

export function listDocumentTypes(): Promise<DocumentTypesDTO> {
  return http.get<DocumentTypesDTO>("/document-types");
}

export function listDocumentTemplates(): Promise<{
  templates: DocumentTemplateDTO[];
}> {
  return http.get<{ templates: DocumentTemplateDTO[] }>("/document-templates");
}

export function saveDocumentTemplate(
  type: string,
  template: TemplateDocument,
): Promise<DocumentTemplateDTO> {
  return http.put<DocumentTemplateDTO>(`/document-templates/${type}`, {
    template,
  });
}

export function resetDocumentTemplate(
  type: string,
): Promise<DocumentTemplateDTO> {
  return http.post<DocumentTemplateDTO>(
    `/document-templates/${type}/reset`,
    {},
  );
}

/**
 * La vista previa la produce el servidor con la MISMA cadena que el PDF. La
 * señal permite abortar la petición en vuelo cuando el texto cambia otra vez.
 */
export function previewDocumentTemplate(
  type: string,
  body: {
    template?: TemplateDocument;
    issuer?: Partial<DocumentsSettingsDTO["issuer"]>;
  },
  signal?: AbortSignal,
): Promise<DocumentPreviewDTO> {
  return http.post<DocumentPreviewDTO>(
    `/document-templates/${type}/preview`,
    body,
    signal ? { signal } : {},
  );
}

export function getDocumentsSettings(): Promise<DocumentsSettingsDTO> {
  return http.get<DocumentsSettingsDTO>("/documents/settings");
}

export function updateDocumentsSettings(
  body: UpdateDocumentsSettingsDTO,
): Promise<DocumentsSettingsDTO> {
  return http.put<DocumentsSettingsDTO>("/documents/settings", body);
}

// ───────────────────────── Documentos emitidos (F8) ─────────────────────────

import type {
  DocumentDTO,
  DocumentFileUrlDTO,
  DocumentSubject,
  DocumentsListDTO,
  IssueDocumentResultDTO,
  IssueSubject,
} from "@/modules/documents/domain/document";

export function listDocuments(
  subject: DocumentSubject,
  params: { page?: number; page_size?: number } = {},
): Promise<DocumentsListDTO> {
  return http.get<DocumentsListDTO>("/documents", {
    subject_kind: subject.kind,
    subject_id: subject.id,
    ...params,
  });
}

export function getDocument(id: string): Promise<DocumentDTO> {
  return http.get<DocumentDTO>(`/documents/${id}`);
}

/** 202: el record nace `queued` con su número; el PDF llega por `document.issued`. */
export function issueDocument(
  typeCode: string,
  subject: IssueSubject,
): Promise<IssueDocumentResultDTO> {
  return http.post<IssueDocumentResultDTO>("/documents", {
    type_code: typeCode,
    subject,
  });
}

export function regenerateDocument(
  id: string,
): Promise<IssueDocumentResultDTO> {
  return http.post<IssueDocumentResultDTO>(`/documents/${id}/regenerate`, {});
}

export function retryDocument(id: string): Promise<DocumentDTO> {
  return http.post<DocumentDTO>(`/documents/${id}/retry`, {});
}

/** URL firmada de cinco minutos: se pide al hacer clic, nunca se guarda. */
export function getDocumentFileUrl(id: string): Promise<DocumentFileUrlDTO> {
  return http.get<DocumentFileUrlDTO>(`/documents/${id}/file`);
}
