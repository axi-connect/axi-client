/**
 * Mapa ÚNICO estado→semáforo del panel de plataforma (spec §4). La escala
 * verde/ámbar/rojo es semántica e independiente de la marca: el coral de axi
 * jamás significa "error". Los estados transitorios llevan spinner.
 *
 * El RENDER vive en `shared/components/features/status-badge`; aquí queda solo
 * el vocabulario de estados de la consola, que no comparte con otros módulos.
 */
import {
  StatusBadge as SharedStatusBadge,
  type StatusMap,
} from "@/shared/components/features/status-badge";

const STATUS_MAP: StatusMap = {
  // Estables sanos
  active: { label: "Activo", tone: "success" },
  completed: { label: "Completada", tone: "success" },
  current: { label: "Vigente", tone: "success" },
  // Estables sanos — calidad
  passed: { label: "Aprobado", tone: "success" },
  // Atención / transitorios (spinner)
  trial: { label: "Trial", tone: "warning" },
  pending: { label: "Pendiente", tone: "warning", transient: true },
  validating: { label: "Validando", tone: "warning", transient: true },
  migrating: { label: "Migrando", tone: "warning", transient: true },
  copying: { label: "Copiando", tone: "warning", transient: true },
  cutover: { label: "Cutover", tone: "warning", transient: true },
  verifying: { label: "Verificando", tone: "warning", transient: true },
  acknowledged: { label: "Reconocida", tone: "warning" },
  // Atención / transitorios — calidad
  running: { label: "En curso", tone: "warning", transient: true },
  queued: { label: "En cola", tone: "warning", transient: true },
  purging: { label: "Purgando", tone: "warning", transient: true },
  blocked: { label: "Bloqueado", tone: "warning" },
  // Peligro
  suspended: { label: "Suspendido", tone: "destructive" },
  error: { label: "Error", tone: "destructive" },
  failed: { label: "Fallida", tone: "destructive" },
  triggered: { label: "Disparada", tone: "destructive" },
  timeout: { label: "Timeout", tone: "destructive" },
  // Apagados
  inactive: { label: "Inactivo", tone: "neutral" },
  disabled: { label: "Deshabilitada", tone: "neutral" },
  rolled_back: { label: "Revertida", tone: "neutral" },
  resolved: { label: "Resuelta", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  // El API de calidad usa `canceled` (una l); `cancelled` (arriba) es de
  // otros recursos — ambas variantes deben existir.
  canceled: { label: "Cancelada", tone: "neutral" },
  purged: { label: "Purgada", tone: "neutral" },
  archived: { label: "Archivado", tone: "neutral" },
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return <SharedStatusBadge status={status} map={STATUS_MAP} className={className} />;
}
