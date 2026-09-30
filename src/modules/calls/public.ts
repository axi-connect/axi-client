/**
 * Superficie pública del slice `calls` (§3.3 regla 5).
 *
 * Nace para el rail de contexto del inbox: su panel de llamadas consume la
 * lista compacta por contacto sin importar rutas internas del slice.
 */

export { ContactCallsList } from "@/modules/calls/ui/components/ContactCallsList";
// Plan de modos §7: «Llamar» a un contacto desde la ficha, el inbox o Cobros.
export { CallContactButton, useCanPlaceCalls } from "@/modules/calls/ui/components/CallContactButton";
// F3: lo que Cobros le pasa a «Llamar para cobrar».
export type { CollectionsCallSummary } from "@/modules/calls/domain/collections-call";
// Plan de modos §7: el CRM elige el marco de las llamadas que programa.
export { CallTypeSelect } from "@/modules/calls/ui/components/CallTypeSelect";
export {
  callTypeLabel,
  CRM_CALL_TYPES,
  PROACTIVE_CALL_TYPES,
  type CrmCallType,
  type ProactiveCallType,
} from "@/modules/calls/domain/playbooks";
