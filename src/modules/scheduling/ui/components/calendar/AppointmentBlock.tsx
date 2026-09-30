"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/core/lib/utils";
import {
  APPOINTMENT_STATUS_DOT,
  APPOINTMENT_STATUS_LABELS,
  isSettledStatus,
  type AppointmentDTO,
} from "@/modules/scheduling/domain/appointment";
import { fmtClockRange } from "@/modules/scheduling/domain/time-grid";

/** Por debajo de este alto el bloque solo cabe en una línea (nombre). */
const TWO_LINES_PX = 40;
/** Por debajo de este ancho (solapes en la semana) se quita el destello de Axi. */
const NARROW_PX = 100;

/**
 * Bloque de cita posicionado absoluto dentro de la columna de su día (lienzo
 * Agenda premium F1): tarjeta sólida con el estado en el punto, sin franjas
 * de color. Las ya atendidas se apagan; la que cruza medianoche corta su
 * borde. `top/height` en px; `column/columns` → left/width en %.
 */
export function AppointmentBlock({
  appointment,
  contactName,
  serviceName,
  timezone,
  top,
  height,
  column,
  columns,
  columnWidthPx,
  continues,
  onOpen,
}: {
  appointment: AppointmentDTO;
  contactName: string;
  /** Solo en la vista Día, donde la columna es ancha. */
  serviceName?: string | null;
  timezone: string;
  top: number;
  height: number;
  column: number;
  columns: number;
  /** Ancho real de la columna del día, para decidir qué cabe. */
  columnWidthPx: number | null;
  continues: { before: boolean; after: boolean };
  onOpen: (id: string) => void;
}) {
  const width = 100 / columns;
  const isAi = appointment.created_by_type === "ai_agent";
  const timeRange = fmtClockRange(appointment.starts_at, appointment.ends_at, timezone);
  const narrow = columnWidthPx !== null && columnWidthPx / columns < NARROW_PX;
  const status = appointment.status;
  const blockHeight = Math.max(height - 3, 24);

  return (
    <button
      type="button"
      onClick={(event) => {
        // El fondo de la columna crea citas: el clic en un bloque no llega ahí.
        event.stopPropagation();
        onOpen(appointment.id);
      }}
      aria-label={`${contactName}, ${timeRange}, ${APPOINTMENT_STATUS_LABELS[status]}`}
      title={`${contactName} · ${timeRange}`}
      className={cn(
        "absolute z-[2] flex flex-col gap-0.5 overflow-hidden rounded-xl border px-2 py-1.5 text-left shadow-xs transition-[border-color,box-shadow]",
        "hover:z-[3] hover:border-foreground/60 focus-visible:z-[3] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        isSettledStatus(status)
          ? "border-border bg-background"
          : status === "cancelled"
            ? "border-dashed border-border bg-transparent shadow-none"
            : "border-foreground/12 bg-card",
        continues.before && "rounded-t-none [border-top-style:dashed]",
        continues.after && "rounded-b-none",
      )}
      style={{
        top: top + 1,
        height: blockHeight,
        left: `calc(${column * width}% + 4px)`,
        width: `calc(${width}% - 7px)`,
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5 text-xs leading-tight font-semibold">
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", APPOINTMENT_STATUS_DOT[status])} />
        <span
          className={cn(
            "min-w-0 truncate",
            isSettledStatus(status) && "text-foreground/75",
            status === "cancelled" && "text-muted-foreground line-through",
          )}
        >
          {contactName}
        </span>
        {isAi && !narrow && (
          <Sparkles aria-hidden className="size-3 shrink-0 text-accent-violet" />
        )}
      </span>
      {blockHeight >= TWO_LINES_PX && (
        <span className="truncate text-xs leading-tight text-muted-foreground tabular-nums">
          {timeRange}
          {serviceName != null && ` · ${serviceName}`}
        </span>
      )}
    </button>
  );
}
