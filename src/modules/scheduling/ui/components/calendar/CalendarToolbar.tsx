"use client";

import {
  CalendarDays,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Filter,
  List,
  Plus,
  Square,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
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

/** Conmutador Mes/Semana/Día/Lista. En el celular no hay Semana: no cabe. */
const VIEW_ITEMS: readonly SegmentedItem<CalendarViewKind>[] = [
  { value: "month", label: "Mes", icon: CalendarDays },
  { value: "week", label: "Semana", icon: CalendarRange },
  { value: "day", label: "Día", icon: Square },
  { value: "list", label: "Lista", icon: List },
];
const MOBILE_VIEW_ITEMS: readonly SegmentedItem<CalendarViewKind>[] = [
  { value: "day", label: "Día" },
  { value: "month", label: "Mes" },
  { value: "list", label: "Lista" },
];

/**
 * Barra del calendario (lienzo F1): Hoy, ‹ ›, el periodo en Nexa y, a la
 * derecha, el filtro de estado, la vista y «Nueva cita» — la única acción en
 * coral. En el celular se queda en la vista, el filtro y «+»: la navegación
 * por días la hace la tira de la semana.
 */
export function CalendarToolbar({
  title,
  view,
  isDesktop,
  statusFilter,
  canManage,
  onToday,
  onStep,
  onViewChange,
  onStatusChange,
  onCreate,
}: {
  title: string;
  view: CalendarViewKind;
  isDesktop: boolean;
  statusFilter: AppointmentStatus | "all";
  /** `scheduling:manage`: sin él no se ofrece "Nueva cita". */
  canManage: boolean;
  onToday: () => void;
  onStep: (delta: 1 | -1) => void;
  onViewChange: (view: CalendarViewKind) => void;
  onStatusChange: (status: AppointmentStatus | "all") => void;
  onCreate: () => void;
}) {
  const filtered = statusFilter !== "all";

  const statusSelect = (
    <Select
      value={statusFilter}
      onValueChange={(value) => onStatusChange(value as AppointmentStatus | "all")}
    >
      <SelectTrigger
        aria-label="Filtrar por estado"
        className={cn(
          "h-9 rounded-full bg-card",
          isDesktop ? "w-auto min-w-44 gap-2" : "w-9 justify-center px-0 [&>svg:last-child]:hidden",
          filtered && !isDesktop && "bg-foreground text-background",
        )}
      >
        <Filter aria-hidden className="size-3.5 shrink-0" />
        {isDesktop && <SelectValue />}
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="all">Todos los estados</SelectItem>
        {Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!isDesktop) {
    return (
      <div className="flex items-center gap-2">
        <SegmentedControl
          value={view === "week" ? "day" : view}
          onValueChange={onViewChange}
          label="Vista del calendario"
          items={MOBILE_VIEW_ITEMS}
          treatment="lift"
          surface="inline"
          className="w-full min-w-0 flex-1 [&_[data-active=true]]:text-foreground [&>button]:flex-1"
        />
        {statusSelect}
        {canManage && (
          <Button size="icon" className="size-10 shrink-0 rounded-full" aria-label="Nueva cita" onClick={onCreate}>
            <Plus aria-hidden className="size-5" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <Button variant="outline" className="h-9 rounded-full px-4" onClick={onToday}>
        Hoy
      </Button>
      {view !== "list" && (
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Periodo anterior"
            onClick={() => onStep(-1)}
          >
            <ChevronLeft aria-hidden className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Periodo siguiente"
            onClick={() => onStep(1)}
          >
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      )}
      <h2 className="min-w-0 truncate font-heading text-xl font-bold tracking-tight first-letter:uppercase md:text-2xl">
        {title}
      </h2>

      <div className="ml-auto flex flex-wrap items-center gap-2.5">
        {statusSelect}
        <SegmentedControl
          value={view}
          onValueChange={onViewChange}
          label="Vista del calendario"
          items={VIEW_ITEMS}
          labels="auto"
          treatment="lift"
          surface="inline"
          // Tinta en la selección: el icono activo no toma el coral de marca.
          className="[&_[data-active=true]]:text-foreground [&_[data-active=true]_svg]:text-foreground"
        />
        {canManage && (
          <Button className="h-9 rounded-full px-4" onClick={onCreate}>
            <Plus aria-hidden className="size-4" />
            Nueva cita
          </Button>
        )}
      </div>
    </div>
  );
}
