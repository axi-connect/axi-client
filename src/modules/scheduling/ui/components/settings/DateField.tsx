"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { addMonthsToKey, type DayKey } from "@/core/lib/business-time";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { fmtDateDmy } from "@/modules/scheduling/domain/schedule-exceptions";
import { MonthPicker } from "../appointment-form/MonthPicker";

/**
 * Fecha en dd/mm/aaaa (S-05), sin depender del idioma del navegador: el
 * `<input type="date">` nativo pintaba mm/dd/aaaa. Abre el mes del DS
 * (`MonthPicker`, semana desde el lunes) con los festivos marcados por el
 * mismo punto del calendario de días especiales.
 */
export function DateField({
  value,
  onChange,
  todayKey,
  holidays,
  label,
  disabled,
}: {
  value: DayKey | "";
  onChange: (next: DayKey) => void;
  todayKey: DayKey;
  /** Festivos del país del negocio (de `/scheduling/closures`). */
  holidays: ReadonlySet<DayKey>;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<DayKey>(value === "" ? todayKey : value);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setAnchor(value === "" ? todayKey : value);
        setOpen(next);
      }}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label={`${label}: ${value === "" ? "sin elegir" : fmtDateDmy(value)}`}
          className="flex h-9 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm tabular-nums shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 text-left">
            {value === "" ? <span className="text-muted-foreground">dd/mm/aaaa</span> : fmtDateDmy(value)}
          </span>
          <ChevronDown aria-hidden className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <MonthPicker
          anchor={anchor}
          todayKey={todayKey}
          selected={value}
          availableDays={null}
          loading={false}
          marks={{ days: holidays, dotClassName: "bg-accent-amber", label: "Festivo" }}
          onPick={(day) => {
            onChange(day);
            setOpen(false);
          }}
          onStepMonth={(delta) => setAnchor((current) => addMonthsToKey(current, delta))}
        />
      </PopoverContent>
    </Popover>
  );
}
