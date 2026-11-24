/**
 * Mapa ÚNICO estado → rótulo y tono del panel de plataforma (rediseño F1).
 * Lo pinta `PlatformStatePill` (el color en el punto, el texto en foreground:
 * pasa AA en los dos temas). La escala verde/ámbar/rojo es semántica e
 * independiente de la marca: el coral de axi jamás significa «error».
 *
 * Los estados transitorios llevan spinner. Un estado que no está aquí se pinta
 * neutro con su valor crudo (`platformState`): un estado nuevo del servidor
 * debe verse raro, no verse bien por accidente. TypeScript puro.
 */
import type { StatusEntry, StatusMap } from "@/shared/components/features/status-badge/types";
import { TENANT_STATUS_LABELS } from "./labels";

export const PLATFORM_STATES: StatusMap = {
  // Estables sanos
  active: { label: "Activo", tone: "success" },
  completed: { label: "Completada", tone: "success" },
  current: { label: "Vigente", tone: "success" },
  passed: { label: "Aprobado", tone: "success" },
  // En prueba: informativo, no es una alarma (antes «Trial» en ámbar).
  trial: { label: "En prueba", tone: "info" },
  // Atención / transitorios (spinner)
  pending: { label: "Pendiente", tone: "warning", transient: true },
  validating: { label: "Validando", tone: "warning", transient: true },
  migrating: { label: "Migrando", tone: "warning", transient: true },
  copying: { label: "Copiando", tone: "warning", transient: true },
  cutover: { label: "Cambiando de base", tone: "warning", transient: true },
  verifying: { label: "Verificando", tone: "warning", transient: true },
  acknowledged: { label: "Reconocida", tone: "warning" },
  running: { label: "En curso", tone: "warning", transient: true },
  queued: { label: "En cola", tone: "warning", transient: true },
  purging: { label: "Purgando", tone: "warning", transient: true },
  blocked: { label: "Bloqueado", tone: "warning" },
  // Peligro
  suspended: { label: "Suspendido", tone: "destructive" },
  error: { label: "Error", tone: "destructive" },
  failed: { label: "Fallida", tone: "destructive" },
  triggered: { label: "Disparada", tone: "destructive" },
  timeout: { label: "Se agotó el tiempo", tone: "destructive" },
  // Apagados
  inactive: { label: "Inactivo", tone: "neutral" },
  disabled: { label: "Deshabilitada", tone: "neutral" },
  rolled_back: { label: "Revertida", tone: "neutral" },
  resolved: { label: "Resuelta", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  // El API de calidad usa `canceled` (una l); ambas variantes deben existir.
  canceled: { label: "Cancelada", tone: "neutral" },
  purged: { label: "Purgada", tone: "neutral" },
  archived: { label: "Archivado", tone: "neutral" },
  // Capacidades del agente (quality F5)
  cap_pass: { label: "Aprobada", tone: "success" },
  cap_warn: { label: "En alerta", tone: "warning" },
  cap_fail: { label: "Fallida", tone: "destructive" },
  cap_untested: { label: "Sin probar", tone: "neutral" },
};

/**
 * De qué se habla. El vocabulario es el mismo; cambia el género del rótulo:
 * «la empresa» está Activa / Suspendida, «el plan» está Activo.
 */
export type StateSubject = "generic" | "tenant";

export function platformState(status: string, subject: StateSubject = "generic"): StatusEntry {
  const base = PLATFORM_STATES[status];
  if (subject === "tenant" && base) {
    const label = TENANT_STATUS_LABELS[status];
    if (label) return { ...base, label };
  }
  return base ?? { label: status, tone: "neutral" };
}
