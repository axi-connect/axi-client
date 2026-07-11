"use client"

import { useMemo, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Switch } from "@/shared/components/ui/switch"
import { errorMessage } from "@/core/lib/error-messages"
import { replaceSchedules } from "@/modules/companies/infrastructure/services/company-service.adapter"
import { WEEKDAY_LABELS, type CompanySchedule, type ScheduleInput } from "@/modules/companies/domain/company"

/**
 * Editor del horario de atención (`PUT /companies/me/schedules`).
 * Una fila por día (weekday 0=domingo … 6=sábado); los días desactivados
 * simplemente no se envían (el backend reemplaza el set completo).
 */
type DayState = {
  weekday: number
  enabled: boolean
  opens_at: string
  closes_at: string
}

function buildInitialState(schedules: CompanySchedule[]): DayState[] {
  return WEEKDAY_LABELS.map((_, weekday) => {
    const existing = schedules.find((s) => s.weekday === weekday)
    return {
      weekday,
      enabled: Boolean(existing),
      opens_at: existing?.opens_at ?? "08:00",
      closes_at: existing?.closes_at ?? "18:00",
    }
  })
}

export function SchedulesEditor({
  schedules,
  onSaved,
  onError,
}: {
  schedules: CompanySchedule[]
  onSaved?: () => void
  onError?: (message: string) => void
}) {
  const [days, setDays] = useState<DayState[]>(() => buildInitialState(schedules))
  const [saving, setSaving] = useState(false)

  const invalidDays = useMemo(
    () => days.filter((d) => d.enabled && d.opens_at >= d.closes_at).map((d) => WEEKDAY_LABELS[d.weekday]),
    [days],
  )

  const updateDay = (weekday: number, patch: Partial<DayState>) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
  }

  const handleSave = async () => {
    if (saving || invalidDays.length > 0) return
    setSaving(true)
    try {
      const payload: ScheduleInput[] = days
        .filter((d) => d.enabled)
        .map(({ weekday, opens_at, closes_at }) => ({ weekday, opens_at, closes_at }))
      await replaceSchedules({ schedules: payload })
      onSaved?.()
    } catch (err) {
      onError?.(errorMessage(err, "No se pudo guardar el horario"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {days.map((day) => (
          <div
            key={day.weekday}
            className="flex items-center gap-4 rounded-lg border border-border px-3 py-2"
          >
            <Switch
              checked={day.enabled}
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
                  classNameContainer=""
                  onChange={(e) => updateDay(day.weekday, { opens_at: e.target.value })}
                  className="min-w-32 max-w-44 flex-1 tabular-nums"
                  aria-label="Hora de apertura"
                />
                <span className="text-sm text-muted-foreground">a</span>
                <Input
                  type="time"
                  value={day.closes_at}
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

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || invalidDays.length > 0}>
          {saving ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </div>
  )
}
