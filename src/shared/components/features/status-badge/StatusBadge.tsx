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

/**
 * Apariencia «punto»: superficie `secondary` neutra, texto en `foreground` y
 * el tono SOLO en un punto de 6px. Es la que pasa AA en claro — el tinte al
 * 10 % con texto del mismo color da ~2,9:1 en verde— y la que usan las tareas
 * de agente (F2 del seguimiento autónomo). El tinte sigue disponible para los
 * consumidores que ya lo usan; migrarlos es decisión aparte.
 */
const DOT_CLASSES: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground",
};

type StatusBadgeProps = {
  status: string;
  map: StatusMap;
  className?: string;
  appearance?: "tint" | "dot";
};

export function StatusBadge({ status, map, className, appearance = "tint" }: StatusBadgeProps) {
  // Estado desconocido: neutro con el valor crudo. Nunca inventar semántica —
  // un estado nuevo del backend debe verse raro, no verse bien por accidente.
  const entry = map[status] ?? { label: status, tone: "neutral" as const };

  if (appearance === "dot") {
    return (
      <Badge variant="secondary" className={cn("border-border", className)}>
        {entry.transient ? (
          <LoaderCircle aria-hidden="true" className="animate-spin text-info" />
        ) : (
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT_CLASSES[entry.tone])} />
        )}
        {entry.label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(TONE_CLASSES[entry.tone], className)}>
      {entry.transient && <LoaderCircle aria-hidden="true" className="animate-spin" />}
      {entry.label}
    </Badge>
  );
}
