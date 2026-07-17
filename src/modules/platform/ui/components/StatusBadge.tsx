/**
 * Mapa ÚNICO estado→semáforo del panel de plataforma (spec §4). La escala
 * verde/ámbar/rojo es semántica e independiente de la marca: el coral de axi
 * jamás significa "error". Los estados transitorios llevan spinner.
 */
import { LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";

type Tone = "success" | "warning" | "destructive" | "neutral";

const STATUS_MAP: Record<string, { label: string; tone: Tone; transient?: boolean }> = {
  // Estables sanos
  active: { label: "Activo", tone: "success" },
  completed: { label: "Completada", tone: "success" },
  // Atención / transitorios (spinner)
  trial: { label: "Trial", tone: "warning" },
  pending: { label: "Pendiente", tone: "warning", transient: true },
  validating: { label: "Validando", tone: "warning", transient: true },
  migrating: { label: "Migrando", tone: "warning", transient: true },
  copying: { label: "Copiando", tone: "warning", transient: true },
  cutover: { label: "Cutover", tone: "warning", transient: true },
  verifying: { label: "Verificando", tone: "warning", transient: true },
  acknowledged: { label: "Reconocida", tone: "warning" },
  // Peligro
  suspended: { label: "Suspendido", tone: "destructive" },
  error: { label: "Error", tone: "destructive" },
  failed: { label: "Fallida", tone: "destructive" },
  triggered: { label: "Disparada", tone: "destructive" },
  // Apagados
  inactive: { label: "Inactivo", tone: "neutral" },
  disabled: { label: "Deshabilitada", tone: "neutral" },
  rolled_back: { label: "Revertida", tone: "neutral" },
  resolved: { label: "Resuelta", tone: "neutral" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

const TONE_CLASSES: Record<Tone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  status: string;
  className?: string;
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  // Estado desconocido: neutro con el valor crudo (nunca inventar semántica).
  const entry = STATUS_MAP[status] ?? { label: status, tone: "neutral" as const };

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[entry.tone], className)}>
      {entry.transient && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {entry.label}
    </Badge>
  );
}
