"use client";

import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import type { DayKey } from "@/modules/scheduling/domain/business-time";
import { AvailabilityPanel } from "../../components/AvailabilityPanel";
import type { AppointmentFormValues } from "../config/appointment.config";

/**
 * Campo "hora" del formulario de cita: slots sugeridos (AvailabilityPanel,
 * que reacciona a fecha/servicio/duración vía useWatch) + toggle "Otra hora"
 * para agendar off-grid — permitido al operador, no a la IA.
 */
export function TimeAvailabilityField({
  control,
  value,
  error,
  timezone,
  refreshKey,
  onChange,
}: {
  control: Control<AppointmentFormValues>;
  value: string;
  error?: string;
  timezone: string;
  refreshKey: number;
  onChange: (time: string) => void;
}) {
  const [date, productId, durationMinutes] = useWatch({
    control,
    name: ["date", "product_id", "duration_minutes"],
  });
  const [customMode, setCustomMode] = useState(false);

  const duration = Number(durationMinutes);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
      <AvailabilityPanel
        date={(date as DayKey) ?? ""}
        productId={(productId as string) ?? ""}
        durationMinutes={Number.isFinite(duration) ? duration : undefined}
        timezone={timezone}
        selectedTime={customMode ? "" : value}
        refreshKey={refreshKey}
        onPickSlot={(time) => {
          setCustomMode(false);
          onChange(time);
        }}
      />

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3">
        <label className="flex items-center gap-2 text-xs font-medium">
          <Switch
            checked={customMode}
            onCheckedChange={(checked) => {
              setCustomMode(checked);
              if (checked) onChange("");
            }}
            aria-label="Elegir otra hora fuera de la grilla"
          />
          Otra hora (fuera de la grilla)
        </label>
        {customMode && (
          <Input
            type="time"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Hora libre"
            className="h-8 w-fit tabular-nums"
          />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">
        El asistente de IA solo ofrece los horarios sugeridos; como operador puedes agendar a
        cualquier hora.
      </p>
      {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
