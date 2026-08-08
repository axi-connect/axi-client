"use client";

import { useFormState, useWatch, type Control } from "react-hook-form";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import {
  buildRrule,
  describeRrule,
  MONTH_DAY_MAX,
  RECURRENCE_FREQ_LABELS,
  RECURRENCE_WEEKDAYS,
  type RecurrenceConfig,
  type RecurrenceFreq,
  type RecurrenceWeekday,
} from "@/modules/scheduling/domain/recurrence";
import type { ReminderFormValues } from "../../forms/config/reminder.config";

function configFromValues(values: {
  freq: RecurrenceFreq;
  weekdays: RecurrenceWeekday[];
  month_day: number;
  rec_time: string;
}): RecurrenceConfig | null {
  const [hour, minute] = values.rec_time.split(":").map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  return {
    freq: values.freq,
    byWeekdays: values.freq === "WEEKLY" ? values.weekdays : undefined,
    byMonthDay: values.freq === "MONTHLY" ? Number(values.month_day) : undefined,
    hour,
    minute,
  };
}

/**
 * Constructor visual de la recurrencia: frecuencia + días/día del mes + hora.
 * Genera la rrule con `buildRrule` y muestra la lectura humana en vivo —
 * el usuario nunca escribe una rrule a mano.
 */
export function RecurrenceBuilder({
  control,
  setValue,
  /** Rrule original no reconstruible (subset ajeno): aviso de reemplazo. */
  unparsedRrule,
}: {
  control: Control<ReminderFormValues>;
  setValue: <K extends "freq" | "weekdays" | "month_day" | "rec_time">(
    name: K,
    value: ReminderFormValues[K],
  ) => void;
  unparsedRrule?: string | null;
}) {
  const [freq, weekdays, monthDay, recTime] = useWatch({
    control,
    name: ["freq", "weekdays", "month_day", "rec_time"],
  });
  // Los errores viven en claves hermanas ("weekdays", "rec_time"), fuera del
  // alcance del getError del campo anfitrión ("freq"): se leen del control.
  const { errors } = useFormState({ control, name: ["weekdays", "rec_time"] });
  const weekdaysError = errors.weekdays?.message as string | undefined;
  const recTimeError = errors.rec_time?.message as string | undefined;

  const config = configFromValues({
    freq,
    weekdays: weekdays ?? [],
    month_day: Number(monthDay),
    rec_time: recTime ?? "",
  });
  const rrule = config === null ? null : buildRrule(config);
  const description = rrule === null ? null : describeRrule(rrule);

  const toggleWeekday = (code: RecurrenceWeekday) => {
    const current = weekdays ?? [];
    setValue(
      "weekdays",
      current.includes(code) ? current.filter((d) => d !== code) : [...current, code],
    );
  };

  return (
    <div className="space-y-3">
      {unparsedRrule != null && (
        <p className="rounded-lg border border-warning/40 bg-warning/8 px-3 py-2 text-xs">
          Regla actual: <code className="font-mono text-[11px]">{unparsedRrule}</code>. Fue creada
          fuera del editor; al guardar se reemplaza por la que configures aquí.
        </p>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Frecuencia">
        {(Object.keys(RECURRENCE_FREQ_LABELS) as RecurrenceFreq[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={freq === option}
            onClick={() => setValue("freq", option)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              freq === option
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {RECURRENCE_FREQ_LABELS[option]}
          </button>
        ))}
      </div>

      {freq === "WEEKLY" && (
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Días de la semana">
            {RECURRENCE_WEEKDAYS.map((day) => {
              const active = (weekdays ?? []).includes(day.code);
              return (
                <button
                  key={day.code}
                  type="button"
                  aria-pressed={active}
                  aria-label={day.long}
                  onClick={() => toggleWeekday(day.code)}
                  className={cn(
                    "size-9 rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          {weekdaysError !== undefined && (
            <p className="text-xs text-destructive">{weekdaysError}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        {freq === "MONTHLY" && (
          <label className="flex items-center gap-2 text-xs font-medium">
            Día del mes
            <Input
              type="number"
              min={1}
              max={MONTH_DAY_MAX}
              value={Number.isNaN(Number(monthDay)) ? "" : monthDay}
              onChange={(e) => setValue("month_day", Number(e.target.value))}
              aria-label="Día del mes (1 a 28)"
              className="h-8 w-20"
            />
            <span className="font-normal text-muted-foreground">(1–{MONTH_DAY_MAX})</span>
          </label>
        )}
        <label className="flex items-center gap-2 text-xs font-medium">
          Hora de envío
          <Input
            type="time"
            value={recTime ?? ""}
            onChange={(e) => setValue("rec_time", e.target.value)}
            aria-label="Hora de envío"
            className="h-8 w-fit tabular-nums"
          />
        </label>
      </div>
      {recTimeError !== undefined && <p className="text-xs text-destructive">{recTimeError}</p>}

      {rrule !== null && description !== null && (
        <div className="rounded-lg border border-brand/25 bg-brand/5 px-3 py-2 text-xs">
          Se enviará <b>{description.charAt(0).toLowerCase() + description.slice(1)}</b>
          <code className="mt-1 block font-mono text-[10px] text-muted-foreground">{rrule}</code>
        </div>
      )}
    </div>
  );
}
