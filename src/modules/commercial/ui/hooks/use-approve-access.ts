"use client";

import { NO_APPROVE_PERMISSION_MESSAGE, NO_CRM_AI_MESSAGE } from "@/modules/commercial/domain/copy";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

export interface ApproveAccess {
  /** Se pinta «Aprobar» / «Rechazar». */
  canApprove: boolean;
  /** La línea de solo lectura; `null` = nada que decir (puede, o aún no se sabe). */
  readOnlyMessage: string | null;
}

/**
 * Quién decide una acción propuesta (C5): el permiso `commercial:approve` Y
 * la capacidad `crm_ai` del plan (el lote lo trabaja el agente de IA). El
 * servidor NO responde 403 sin `crm_ai`: aprobar solo exige `crm` +
 * `commercial:approve`, y la capacidad se comprueba al encender cada artefacto,
 * que vuelve como `failed` en un 200 (`approvalLines` lo explica con
 * `CRM_AI_MISSING_FAILED`). Ocultar el botón evita ese camino; mientras las
 * capacidades cargan no se ofrece ni se niega: ni botón ni línea.
 */
export function useApproveAccess(): ApproveAccess {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  if (!hasPermission("commercial:approve")) return { canApprove: false, readOnlyMessage: NO_APPROVE_PERMISSION_MESSAGE };
  if (!loaded) return { canApprove: false, readOnlyMessage: null };
  if (!hasCapability("crm_ai")) return { canApprove: false, readOnlyMessage: NO_CRM_AI_MESSAGE };
  return { canApprove: true, readOnlyMessage: null };
}
