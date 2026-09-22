/**
 * SUPERFICIE PÚBLICA del slice `documents` (architecture.md §3.3; F7 del
 * programa Cobros). Los documentos son el papel de la EMPRESA y los consume
 * cualquier proceso —pedidos, CRM, agenda, inbox—, así que todo lo que un
 * consumidor necesita se declara AQUÍ: un solo juego de componentes, nada se
 * replica por proceso.
 *
 * Consumidores hoy: Mi empresa › Documentos (`/settings/company/documentos`),
 * que monta `DocumentsTab`. En F8 se añaden `DocumentsList`,
 * `IssueDocumentMenu` y `SendDocumentDialog`, que reciben un `subject
 * {kind, id}` genérico — la misma forma que `DocumentSubjectRef` en el
 * servidor — para que el primer consumidor no imponga su vocabulario.
 */
export {
  WHEN_PATH_LABELS,
  blockSummary,
  extractVariableNames,
  templateHash,
  unknownTemplateVariables,
  type BlockCatalogView,
  type BlockType,
  type DocumentTemplateDTO,
  type DocumentTypeView,
  type DocumentTypesDTO,
  type DocumentsSettingsDTO,
  type TemplateBlock,
  type TemplateDocument,
  type TemplateVariableView,
} from "./domain/template";
export {
  getDocumentsSettings,
  listDocumentTemplates,
  listDocumentTypes,
  previewDocumentTemplate,
  resetDocumentTemplate,
  saveDocumentTemplate,
  updateDocumentsSettings,
} from "./infrastructure/services/documents-service.adapter";
export { useTemplatePreview } from "./infrastructure/hooks/use-template-preview";
export { DocumentTemplateEditor } from "./ui/components/templates/DocumentTemplateEditor";
export {
  TemplatePreviewFrame,
  withHostFonts,
} from "./ui/components/templates/TemplatePreviewFrame";
export { DocumentKindTabs } from "./ui/components/templates/DocumentKindTabs";
export { DocumentSettingsForm } from "./ui/forms/DocumentSettingsForm";
export { DocumentsTab } from "./ui/DocumentsTab";
