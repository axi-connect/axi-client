"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { errorMessage } from "@/core/lib/error-messages"
import { replaceSchedules } from "@/modules/companies/infrastructure/services/company-service.adapter"
import type { CompanySchedule } from "@/modules/companies/domain/company"
import {
  buildDayStates,
  invalidScheduleDays,
  toScheduleInputs,
  type DayState,
} from "@/modules/companies/domain/schedules"
import { SchedulesFields } from "./SchedulesFields"

/**
 * Editor del horario de atención GENERAL (`PUT /companies/me/schedules`).
 * Autocontenido: guarda por su cuenta y avisa por callbacks. Las filas viven en
 * `SchedulesFields`, compartidas con el horario propio de cada sucursal.
 */
export function SchedulesEditor({
  schedules,
  onSaved,
  onError,
}: {
  schedules: CompanySchedule[]
  onSaved?: () => void
  onError?: (message: string) => void
}) {
  const [days, setDays] = useState<DayState[]>(() => buildDayStates(schedules))
  const [saving, setSaving] = useState(false)
  const invalid = invalidScheduleDays(days).length > 0

  const handleSave = async () => {
    if (saving || invalid) return
    setSaving(true)
    try {
      await replaceSchedules({ schedules: toScheduleInputs(days) })
      onSaved?.()
    } catch (err) {
      onError?.(errorMessage(err, "No se pudo guardar el horario"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <SchedulesFields value={days} onChange={setDays} disabled={saving} />
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || invalid}>
          {saving ? "Guardando..." : "Guardar horario"}
        </Button>
      </div>
    </div>
  )
}
