"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { useWatch, type Control } from "react-hook-form";
import { Input } from "@/shared/components/ui/input";
import { Switch } from "@/shared/components/ui/switch";
import type { DayKey } from "@/core/lib/business-time";
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
  outsideHours = null,
  onChange,
}: {
  control: Control<AppointmentFormValues>;
  value: string;
  error?: string;
  timezone: string;
  refreshKey: number;
  outsideHours?: { time: string; openHours: string | null } | null;
  onChange: (time: string) => void;
}) {
  const [date, productId, durationMinutes] = useWatch({
    control,
    name: ["date", "product_id", "duration_minutes"],
  });
  // El hueco fuera de horario no es un horario sugerido: arranca en «Otra hora».
  const [customMode, setCustomMode] = useState(outsideHours !== null);

  const duration = Number(durationMinutes);

  return (
    <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
      {outsideHours !== null && customMode && value === outsideHours.time && (
        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-card p-3 text-sm">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-foreground/80">
            <span className="font-semibold text-foreground">
              {outsideHours.time.replace(/^0/, "")} está fuera de tu horario
            </span>
            {outsideHours.openHours !== null ? ` (${outsideHours.openHours})` : ""}. Puedes agendarla
            igual: la cita queda en la agenda y Axi le envía sus recordatorios.
          </p>
        </div>
      )}
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
      <p className="text-xs text-muted-foreground">
        El asistente de IA solo ofrece los horarios sugeridos; como operador puedes agendar a
        cualquier hora.
      </p>
      {error !== undefined && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
