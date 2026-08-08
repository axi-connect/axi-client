"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  normalizeOffsets,
  offsetLabel,
  SETTINGS_LIMITS,
  TIME_UNIT_LABELS,
  unitToMinutes,
  type TimeUnit,
} from "@/modules/scheduling/domain/settings";

const PRESETS: number[] = [30, 60, 180, 1440, 2880]; // 30 min, 1 h, 3 h, 1 día, 2 días

/**
 * Editor de `reminder_offsets_minutes`: chips removibles + presets + valor
 * personalizado (máx 6, 1 min – 28 días). Los offsets son minutos ANTES de la
 * cita; el sistema crea los recordatorios automáticos con ellos.
 */
export function ReminderOffsetsEditor({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: number[];
  onChange: (offsets: number[]) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [customValue, setCustomValue] = useState("");
  const [customUnit, setCustomUnit] = useState<TimeUnit>("hours");

  const { maxItems, min, max } = SETTINGS_LIMITS.reminder_offsets_minutes;
  const atCapacity = value.length >= maxItems;

  const add = (minutes: number) => {
    if (disabled || atCapacity) return;
    if (minutes < min || minutes > max) return;
    onChange(normalizeOffsets([...value, minutes]));
  };

  const addCustom = () => {
    const parsed = Number(customValue);
    if (!Number.isInteger(parsed) || parsed <= 0) return;
    add(unitToMinutes(parsed, customUnit));
    setCustomValue("");
  };

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin recordatorios automáticos: las citas nuevas no avisan al contacto.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {value.map((minutes) => (
            <li
              key={minutes}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium"
            >
              {offsetLabel(minutes)}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Quitar recordatorio de ${offsetLabel(minutes)}`}
                  className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onChange(value.filter((m) => m !== minutes))}
                >
                  <X aria-hidden className="size-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!disabled && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.filter((preset) => !value.includes(preset)).map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={atCapacity}
                onClick={() => add(preset)}
                className={cn(
                  "rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground transition-colors",
                  "hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  atCapacity && "cursor-not-allowed opacity-45",
                )}
              >
                + {offsetLabel(preset)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              min={1}
              value={customValue}
              disabled={atCapacity}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Personalizado"
              aria-label="Valor personalizado"
              className="h-8 w-32"
            />
            <Select
              value={customUnit}
              onValueChange={(unit) => setCustomUnit(unit as TimeUnit)}
              disabled={atCapacity}
            >
              <SelectTrigger size="sm" aria-label="Unidad" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_UNIT_LABELS).map(([unit, label]) => (
                  <SelectItem key={unit} value={unit}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={atCapacity || customValue === ""}
              onClick={addCustom}
            >
              Añadir
            </Button>
          </div>
          {atCapacity && (
            <p className="text-xs text-muted-foreground">
              Máximo {maxItems} recordatorios automáticos.
            </p>
          )}
        </>
      )}
      {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
