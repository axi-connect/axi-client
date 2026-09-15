/**
 * SUPERFICIE PÚBLICA del slice `scheduling` (architecture.md §3.3).
 *
 * Tiempo «de pared» del negocio: convertir entre instantes UTC y la fecha/hora
 * en la zona de la empresa. Lo consume el CRM (F2 del seguimiento autónomo)
 * para programar tareas de agente a una hora del negocio y pintarlas en su
 * agenda, con la MISMA aritmética que la agenda de citas — nunca la zona del
 * navegador.
 */
export {
  addDaysToKey,
  businessDayKey,
  diffDays,
  hhmmFromInstant,
  instantFromBusiness,
  minutesIntoDay,
  todayKey,
  weekdayOfKey,
  type DayKey,
} from "./domain/business-time";
