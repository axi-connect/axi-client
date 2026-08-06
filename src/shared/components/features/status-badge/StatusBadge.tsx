import { LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import type { StatusMap, StatusTone } from "./types";

/**
 * Semáforo de estado, presentacional puro. La escala verde/ámbar/rojo es
 * SEMÁNTICA y vive fuera de la marca: el coral de axi jamás significa "error"
 * (DESIGN.md §8.8). El `info` cubre estados neutros-pero-activos (programado,
 * entregado) que no son ni éxito ni advertencia.
 *
 * El mapa estado→tono lo aporta cada slice (`StatusMap`), no este componente:
 * los estados de una campaña y los de una ejecución de QA no comparten
 * vocabulario, pero sí el tratamiento visual.
 */
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  destructive: "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-info/40 bg-info/10 text-info",
  neutral: "border-border bg-muted text-muted-foreground",
};

type StatusBadgeProps = {
  status: string;
  map: StatusMap;
  className?: string;
};

export function StatusBadge({ status, map, className }: StatusBadgeProps) {
  // Estado desconocido: neutro con el valor crudo. Nunca inventar semántica —
  // un estado nuevo del backend debe verse raro, no verse bien por accidente.
  const entry = map[status] ?? { label: status, tone: "neutral" as const };

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[entry.tone], className)}>
      {entry.transient && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {entry.label}
    </Badge>
  );
}
