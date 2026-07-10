import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";

/**
 * Mensajes en español por `code` RFC 7807 del backend.
 * Cae al `detail`/`title` del problema (en dev añade el `trace_id` para soporte).
 */
const MESSAGES_BY_CODE: Record<string, string> = {
  [API_ERROR_CODES.validationFailed]: "Revisa los campos marcados",
  [API_ERROR_CODES.invalidCredentials]: "Correo o contraseña incorrectos",
  [API_ERROR_CODES.ambiguousCompany]: "Tu correo existe en varias empresas: indica el NIT",
  [API_ERROR_CODES.unauthorized]: "Tu sesión expiró. Vuelve a iniciar sesión",
  [API_ERROR_CODES.refreshReuseDetected]: "Por seguridad tu sesión fue revocada. Inicia sesión de nuevo",
  [API_ERROR_CODES.companySuspended]: "La empresa está suspendida. Contacta a soporte",
  [API_ERROR_CODES.permissionDenied]: "No tienes permiso para realizar esta acción",
  [API_ERROR_CODES.usageLimitExceeded]: "Alcanzaste el límite de uso del plan",
  [API_ERROR_CODES.outsideServiceWindow]: "Fuera de la ventana de 24 h de WhatsApp: se requiere plantilla",
  [API_ERROR_CODES.invalidTransition]: "La conversación no admite esa transición",
  [API_ERROR_CODES.handoffConflict]: "Otro operador tomó la conversación primero",
  [API_ERROR_CODES.notFound]: "El recurso ya no existe",
  "identities/nit_taken": "Ya existe una empresa con ese NIT",
  "identities/email_taken": "Ya existe un usuario con ese correo",
  "identities/owner_protected": "El usuario owner no puede modificarse así",
  "rbac/system_role_immutable": "Los roles de sistema no se pueden modificar",
  "rbac/role_not_found": "El rol ya no existe",
  "ai/template_immutable": "Las plantillas del sistema no se pueden modificar",
  "ai/character_in_use": "El character está en uso por un agente",
  "ai/intention_code_taken": "Ya existe una intención con ese código",
  "channels/provider_account_taken": "Ese número/cuenta ya está conectado en otro canal",
  "channels/invalid_credentials": "Las credenciales del canal no son válidas",
  "channels/not_connected": "El canal no está conectado",
  "channels/qr_not_available": "El código QR aún no está disponible",
  "channels/no_worker_available": "No hay workers de WhatsApp Web disponibles",
  "client/network": "No fue posible contactar al servidor",
};

export function errorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (isHttpError(error)) {
    const known = MESSAGES_BY_CODE[error.code];
    if (known) return known;
    if (error.status === 429) {
      const wait = error.retryAfterSeconds ? ` Reintenta en ${error.retryAfterSeconds}s.` : "";
      return `Demasiadas peticiones.${wait}`;
    }
    const base = error.problem?.detail || error.problem?.title || fallback;
    if (process.env.NODE_ENV !== "production" && error.problem?.trace_id) {
      return `${base} (trace: ${error.problem.trace_id})`;
    }
    return base;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/**
 * Mapea los issues de `validation/failed` (`errors[]` con `path` de Zod del
 * backend) a los campos del form RHF. Devuelve true si aplicó al menos uno
 * (la UI puede omitir el toast general en ese caso).
 */
export function applyServerValidation<TValues extends FieldValues>(
  error: unknown,
  form: UseFormReturn<TValues>,
): boolean {
  if (!isHttpError(error) || !error.is(API_ERROR_CODES.validationFailed)) return false;

  let applied = false;
  for (const issue of error.validationIssues) {
    const field = issue.path?.filter((p) => typeof p === "string").join(".");
    if (!field) continue;
    form.setError(field as Path<TValues>, { type: "server", message: issue.message });
    applied = true;
  }
  return applied;
}
