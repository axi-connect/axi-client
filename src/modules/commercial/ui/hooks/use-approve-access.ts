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
 * la capacidad `crm_ai` del plan (el lote lo trabaja el agente de IA; sin
 * ella el servidor respondería 403 al aprobar). Mientras las capacidades
 * cargan no se ofrece ni se niega: ni botón ni línea.
 */
export function useApproveAccess(): ApproveAccess {
  const { hasPermission } = useAuth();
  const { loaded, hasCapability } = useEntitlements();
  if (!hasPermission("commercial:approve")) return { canApprove: false, readOnlyMessage: NO_APPROVE_PERMISSION_MESSAGE };
  if (!loaded) return { canApprove: false, readOnlyMessage: null };
  if (!hasCapability("crm_ai")) return { canApprove: false, readOnlyMessage: NO_CRM_AI_MESSAGE };
  return { canApprove: true, readOnlyMessage: null };
}
