"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { AppointmentDTO, AppointmentStatus } from "@/modules/scheduling/domain/appointment";
import { fmtTimeRange } from "@/modules/scheduling/domain/business-time";

/** Tinte por estado del bloque en la grilla horaria (borde izquierdo + fondo). */
const BLOCK_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "border-l-info bg-info/10 hover:bg-info/15",
  confirmed: "border-l-success bg-success/10 hover:bg-success/15",
  completed: "border-l-muted-foreground bg-secondary hover:bg-secondary/80",
  cancelled: "border-l-destructive bg-destructive/5 opacity-60 hover:opacity-80",
  no_show: "border-l-warning bg-warning/10 hover:bg-warning/15",
};

/**
 * Bloque de cita posicionado absoluto dentro de la columna de su día.
 * `top/height` en px (minutos × escala); `column/columns` → left/width en %.
 */
export function AppointmentBlock({
  appointment,
  contactName,
  timezone,
  top,
  height,
  column,
  columns,
  continues,
  onOpen,
}: {
  appointment: AppointmentDTO;
  contactName: string;
  timezone: string;
  top: number;
  height: number;
  column: number;
  columns: number;
  continues: { before: boolean; after: boolean };
  onOpen: (id: string) => void;
}) {
  const width = 100 / columns;
  const isAi = appointment.created_by_type === "ai_agent";
  const timeRange = fmtTimeRange(appointment.starts_at, appointment.ends_at, timezone);

  return (
    <button
      type="button"
      onClick={() => onOpen(appointment.id)}
      title={`${contactName} · ${timeRange}`}
      className={cn(
        "absolute z-[2] overflow-hidden rounded-lg border-l-3 px-1.5 py-1 text-left text-[11px] leading-tight shadow-xs transition-all",
        "hover:z-[3] hover:shadow-md focus-visible:z-[3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        BLOCK_CLASSES[appointment.status],
        continues.before && "rounded-t-none border-t border-dashed border-t-border",
        continues.after && "rounded-b-none",
      )}
      style={{
        top,
        height: Math.max(height, 22),
        left: `calc(${column * width}% + 1px)`,
        width: `calc(${width}% - 3px)`,
      }}
    >
      <span className="block truncate font-semibold text-foreground">
        {isAi && (
          <Sparkles
            aria-label="Agendada por el asistente"
            className="mr-0.5 inline size-3 text-accent-violet"
          />
        )}
        {contactName}
      </span>
      {height >= 36 && (
        <span className="block truncate text-muted-foreground tabular-nums">{timeRange}</span>
      )}
    </button>
  );
}
