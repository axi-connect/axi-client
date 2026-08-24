"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  Plus,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  APPOINTMENT_STATUS_LABELS,
  type AppointmentStatus,
} from "@/modules/scheduling/domain/appointment";
import type { CalendarViewKind } from "@/modules/scheduling/domain/calendar-range";

/** Conmutador Mes/Semana/Día/Lista. */
const VIEW_ITEMS: readonly SegmentedItem<CalendarViewKind>[] = [
  { value: "month", label: "Mes", icon: CalendarDays },
  { value: "week", label: "Semana", icon: CalendarRange },
  { value: "day", label: "Día", icon: Clock },
  { value: "list", label: "Lista", icon: List },
];

export function CalendarToolbar({
  title,
  view,
  statusFilter,
  timezone,
  canManage,
  onToday,
  onStep,
  onViewChange,
  onStatusChange,
  onCreate,
}: {
  title: string;
  view: CalendarViewKind;
  statusFilter: AppointmentStatus | "all";
  timezone: string | null;
  /** `scheduling:manage`: sin él no se ofrece "Nueva cita". */
  canManage: boolean;
  onToday: () => void;
  onStep: (delta: 1 | -1) => void;
  onViewChange: (view: CalendarViewKind) => void;
  onStatusChange: (status: AppointmentStatus | "all") => void;
  onCreate: () => void;
}) {
  const browserTz =
    typeof window === "undefined" ? null : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzMismatch = timezone !== null && browserTz !== null && browserTz !== timezone;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <Button variant="outline" size="sm" onClick={onToday}>
        Hoy
      </Button>
      {view !== "list" && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Periodo anterior"
            onClick={() => onStep(-1)}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Periodo siguiente"
            onClick={() => onStep(1)}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      )}
      <h2 className="min-w-0 truncate text-base font-semibold capitalize tracking-tight md:text-lg">
        {title}
      </h2>

      <div className="ml-auto flex flex-wrap items-center gap-2 md:gap-3">
        {tzMismatch && (
          <span
            className="hidden text-xs text-muted-foreground lg:inline"
            title={`Tu navegador está en ${browserTz}; la agenda se muestra en la zona del negocio.`}
          >
            Horas en {timezone}
          </span>
        )}
        <Select
          value={statusFilter}
          onValueChange={(value) => onStatusChange(value as AppointmentStatus | "all")}
        >
          <SelectTrigger size="sm" aria-label="Filtrar por estado" className="w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SegmentedControl
        value={view}
        onValueChange={onViewChange}
        label="Vista del calendario"
        items={VIEW_ITEMS}
        // En la barra del calendario compiten con el rango y los filtros: por
        // debajo de `md` solo la vista activa muestra su nombre.
        labels="auto"
      />
        {canManage && (
          <Button size="sm" onClick={onCreate}>
            <Plus aria-hidden className="size-4" />
            Nueva cita
          </Button>
        )}
      </div>
    </div>
  );
}
