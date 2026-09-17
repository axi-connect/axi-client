/**
 * SUPERFICIE PÚBLICA del slice `marketing` (architecture.md §3.3).
 *
 * Plantillas de Meta (HSM): las únicas que pueden ABRIR una conversación cuando
 * el cliente lleva más de 24 h sin escribir. Las consume el CRM para la
 * «plantilla de apertura» de una tarea de agente (F2 del seguimiento autónomo).
 * El ciclo de vida sigue siendo de marketing/channels; aquí solo se lee.
 */
export {
  listHsmTemplates,
  createHsmTemplate,
} from "./infrastructure/services/templates-service.adapter";
export {
  isUsableAsOpening,
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
export {
  bulkOpeningCost,
  formatUsd,
  type BulkOpeningCost,
} from "./domain/template-cost";
