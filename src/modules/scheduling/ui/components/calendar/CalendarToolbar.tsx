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
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
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

const VIEW_OPTIONS: Array<{ value: CalendarViewKind; label: string; icon: React.ReactNode }> = [
  { value: "month", label: "Mes", icon: <CalendarDays aria-hidden className="size-3.5" /> },
  { value: "week", label: "Semana", icon: <CalendarRange aria-hidden className="size-3.5" /> },
  { value: "day", label: "Día", icon: <Clock aria-hidden className="size-3.5" /> },
  { value: "list", label: "Lista", icon: <List aria-hidden className="size-3.5" /> },
];

/** Conmutador Mes/Semana/Día/Lista (patrón SegmentedToggle del pipeline). */
function ViewToggle({
  view,
  onChange,
}: {
  view: CalendarViewKind;
  onChange: (view: CalendarViewKind) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Vista del calendario"
      className="flex items-center rounded-full border border-border bg-secondary/60 p-1"
    >
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.value}
          role="tab"
          aria-selected={view === option.value}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            view === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  );
}

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
        <ViewToggle view={view} onChange={onViewChange} />
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
