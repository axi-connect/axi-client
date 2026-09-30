import type { AvailabilityDTO, AvailabilitySlot } from "./availability";
import { addDaysToKey, businessDayKey, monthMatrix, monthOfKey, type DayKey } from "@/core/lib/business-time";

/**
 * El mes del formulario de cita (lienzo Agenda premium F2): qué días tienen
 * horarios libres y cuáles son. Una sola consulta de disponibilidad por mes
 * (el backend admite hasta 31 días), repartida por día de negocio. Puro.
 */

/** Primer y último día a consultar del mes de `anchor`, sin días ya pasados. */
export function monthQueryRange(anchor: DayKey, today: DayKey): { from: DayKey; to: DayKey } | null {
  const month = monthOfKey(anchor);
  const days = monthMatrix(anchor).filter((d) => monthOfKey(d) === month);
  const from = days[0] < today ? today : days[0];
  const to = days[days.length - 1];
  return from > to ? null : { from, to };
}

/** Slots libres (cupo > 0) agrupados por día de negocio. */
export function slotsByDay(availability: AvailabilityDTO, tz: string): Map<DayKey, AvailabilitySlot[]> {
  const byDay = new Map<DayKey, AvailabilitySlot[]>();
  for (const slot of availability.slots) {
    if (slot.remaining_capacity <= 0) continue;
    const key = businessDayKey(slot.starts_at, tz);
    const bucket = byDay.get(key);
    if (bucket === undefined) byDay.set(key, [slot]);
    else bucket.push(slot);
  }
  return byDay;
}

/** El primer día con horarios libres desde `from` (para abrir el formulario ya elegido). */
export function firstAvailableDay(byDay: Map<DayKey, AvailabilitySlot[]>, from: DayKey, limitDays = 31): DayKey | null {
  for (let i = 0, day = from; i < limitDays; i++, day = addDaysToKey(day, 1)) {
    if ((byDay.get(day)?.length ?? 0) > 0) return day;
  }
  return null;
}
