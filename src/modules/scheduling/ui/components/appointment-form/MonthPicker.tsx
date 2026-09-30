"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { dayNumber } from "@/modules/scheduling/domain/time-grid";
import { fmtDayLong, fmtMonthTitle, monthMatrix, monthOfKey, type DayKey } from "@/core/lib/business-time";

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

/**
 * El mes del formulario de cita (lienzo F2, D1): reemplaza el `<input type=date>`
 * nativo. Cada día con horarios libres lleva un punto; los días pasados no se
 * eligen. El elegido va en tinta y hoy con un aro.
 */
export function MonthPicker({
  anchor,
  todayKey,
  selected,
  availableDays,
  loading,
  onPick,
  onStepMonth,
}: {
  /** Cualquier día del mes que se pinta. */
  anchor: DayKey;
  todayKey: DayKey;
  selected: DayKey | "";
  /** Días con horarios libres; `null` mientras carga o si no hay horario. */
  availableDays: ReadonlySet<DayKey> | null;
  loading: boolean;
  onPick: (day: DayKey) => void;
  onStepMonth: (delta: 1 | -1) => void;
}) {
  const month = monthOfKey(anchor);
  // 5 o 6 semanas: se corta la última si es entera del mes siguiente.
  const matrix = monthMatrix(anchor);
  const days = monthOfKey(matrix[35]) !== month ? matrix.slice(0, 35) : matrix;
  const canGoBack = month > monthOfKey(todayKey);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold first-letter:uppercase">
          {fmtMonthTitle(anchor).replace(" de ", " ")}
        </h3>
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label="Mes anterior"
            disabled={!canGoBack}
            onClick={() => onStepMonth(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-40"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Mes siguiente"
            onClick={() => onStepMonth(1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      <div aria-hidden className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {LETTERS.map((letter) => (
          <span key={letter}>{letter}</span>
        ))}
      </div>
      <div role="group" aria-label="Días del mes" aria-busy={loading} className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const inMonth = monthOfKey(day) === month;
          const past = day < todayKey;
          const free = availableDays?.has(day) ?? false;
          const isSelected = day === selected;
          const isToday = day === todayKey;
          return (
            <button
              key={day}
              type="button"
              disabled={past || !inMonth}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${fmtDayLong(day)}${free ? ", con horarios libres" : ""}`}
              onClick={() => onPick(day)}
              className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-default"
            >
              <span
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-full font-heading text-sm font-semibold tabular-nums transition-colors",
                  isSelected
                    ? "bg-foreground text-background"
                    : isToday
                      ? "ring-[1.5px] ring-foreground ring-inset"
                      : "",
                  !isSelected && (past || !inMonth) && "font-medium text-muted-foreground/60",
                  !isSelected && !past && inMonth && "hover:bg-secondary",
                )}
              >
                {dayNumber(day)}
              </span>
              <span aria-hidden className={cn("size-1 rounded-full", free && !past && inMonth ? "bg-success" : "bg-transparent")} />
            </button>
          );
        })}
      </div>
      {availableDays !== null && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span aria-hidden className="size-1.5 rounded-full bg-success" />
          Con horarios libres
        </p>
      )}
    </div>
  );
}
