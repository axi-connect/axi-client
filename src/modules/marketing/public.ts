/**
 * SUPERFICIE PÚBLICA del slice `marketing` (architecture.md §3.3).
 *
 * Plantillas de Meta (HSM): las únicas que pueden ABRIR una conversación cuando
 * el cliente lleva más de 24 h sin escribir. Las consume el CRM para la
 * «plantilla de apertura» de una tarea de agente (F2 del seguimiento autónomo).
 * El ciclo de vida sigue siendo de marketing/channels; aquí solo se lee.
 *
 * `MarketingHeader`: la cabecera con la navegación única del módulo. Captación
 * (`/marketing/leads`, slice `prospecting`) vive bajo marketing y monta
 * `MarketingHeader` en cada una de sus secciones (`CaptureHeader`).
 */
export {
  listHsmTemplates,
  createHsmTemplate,
} from "./infrastructure/services/templates-service.adapter";
export {
  isUsableAsOpening,
  isUsableAs,
  whyUnusableAs,
  type HsmPurpose,
  whyUnusableAsOpening,
  isUsableForMarketing,
  whyUnusable,
  countTemplateVariables,
  TEMPLATE_COST_CO_USD,
  formatTemplateCost,
  HSM_STATUS_MAP,
  type HsmTemplateDTO,
} from "./domain/template-catalog";
export { HSM_CATEGORY_LABELS } from "./domain/enums";
export { renderHsmPreview, type PreviewSegment } from "./domain/hsm-preview";
// El inbox pinta la cabecera, el pie y los botones de una plantilla ya enviada.
export { readTemplatePieces, type TemplateButton } from "./domain/template-pieces";
export {
  bulkOpeningCost,
  formatUsd,
  type BulkOpeningCost,
} from "./domain/template-cost";
// Las migas de las plantillas de Meta (el layout privado las junta con las de otros módulos).
export { META_TEMPLATES_BREADCRUMBS } from "./domain/breadcrumbs";
export { MarketingHeader } from "./ui/components/MarketingHeader";
// La bandeja pinta la imagen, el video o el documento de una plantilla enviada.
export { TemplateMediaHeader } from "./ui/components/TemplateMediaHeader";
export { SendTemplateButton } from "./ui/components/SendTemplateButton";
export { presetToSearchParams, type PresetAudience } from "./domain/campaign-draft";
