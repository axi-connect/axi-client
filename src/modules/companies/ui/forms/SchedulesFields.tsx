"use client"

import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { WEEKDAY_LABELS } from "@/modules/companies/domain/company"
import { invalidScheduleDays, type DayState } from "@/modules/companies/domain/schedules"

/**
 * Las 7 filas del horario, CONTROLADAS (`value`/`onChange`): las usa el editor
 * de la empresa (que guarda por su cuenta) y el formulario de una sucursal
 * (que las envía dentro de su propio guardado). Una sola implementación de la
 * fila «día · apertura · cierre»; la validación visual va incluida.
 */
export function SchedulesFields({
  value,
  onChange,
  disabled = false,
}: {
  value: DayState[]
  onChange: (days: DayState[]) => void
  disabled?: boolean
}) {
  const invalidDays = invalidScheduleDays(value)
  const updateDay = (weekday: number, patch: Partial<DayState>) => {
    onChange(value.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {value.map((day) => (
          <div
            key={day.weekday}
            className="flex items-center gap-4 rounded-lg border border-border px-3 py-2"
          >
            <Switch
              checked={day.enabled}
              disabled={disabled}
              onCheckedChange={(checked: boolean) => updateDay(day.weekday, { enabled: checked })}
              aria-label={`Atención el ${WEEKDAY_LABELS[day.weekday]}`}
            />
            <span className="w-24 text-sm font-medium">{WEEKDAY_LABELS[day.weekday]}</span>
            {day.enabled ? (
              /* flex-1 + min-w: los inputs de hora crecen según el formato del
                 locale (p.ej. "08:00 a. m." + icono de reloj); un ancho fijo
                 corto recorta el valor. max-w acota en pantallas anchas. */
              <div className="flex flex-1 items-center gap-2">
                <Input
                  type="time"
                  value={day.opens_at}
                  disabled={disabled}
                  classNameContainer=""
                  onChange={(e) => updateDay(day.weekday, { opens_at: e.target.value })}
                  className="min-w-32 max-w-44 flex-1 tabular-nums"
                  aria-label="Hora de apertura"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="time"
                  value={day.closes_at}
                  disabled={disabled}
                  classNameContainer=""
                  onChange={(e) => updateDay(day.weekday, { closes_at: e.target.value })}
                  className="min-w-32 max-w-44 flex-1 tabular-nums"
                  aria-label="Hora de cierre"
                />
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Cerrado</span>
            )}
          </div>
        ))}
      </div>

      {invalidDays.length > 0 && (
        <p className="text-sm text-destructive" role="alert">
          La hora de cierre debe ser posterior a la de apertura: {invalidDays.join(", ")}.
        </p>
      )}
    </div>
  )
}
