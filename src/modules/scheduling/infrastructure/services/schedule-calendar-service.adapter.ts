import { http } from "@/core/services/http";
import type { DayKey } from "@/core/lib/business-time";
import type {
  ClosuresDTO,
  PutScheduleExceptionDTO,
  ScheduleExceptionDTO,
  ScheduleExceptionListDTO,
} from "@/modules/scheduling/domain/schedule-exceptions";

/**
 * Días especiales (`/scheduling/exceptions`) y cierres del calendario
 * (`/scheduling/closures`). El PUT es por fecha y REEMPLAZA lo que hubiera
 * ese día; responde la lista vigente para refrescar la vista sin otro GET.
 */
export async function listScheduleExceptions(): Promise<ScheduleExceptionDTO[]> {
  const res = await http.get<ScheduleExceptionListDTO>("/scheduling/exceptions");
  return res.items;
}

export async function putScheduleException(
  date: DayKey,
  dto: PutScheduleExceptionDTO,
): Promise<ScheduleExceptionDTO[]> {
  const res = await http.put<ScheduleExceptionListDTO>(`/scheduling/exceptions/${date}`, dto);
  return res.items;
}

export function deleteScheduleException(date: DayKey): Promise<void> {
  return http.delete<void>(`/scheduling/exceptions/${date}`);
}

/**
 * Fechas del rango que no siguen el horario semanal (días especiales y
 * festivos). Sin rango: desde hoy y 60 días, en la zona del negocio. Máx. 92 días.
 */
export function getClosures(range?: { from: DayKey; to: DayKey }): Promise<ClosuresDTO> {
  return http.get<ClosuresDTO>("/scheduling/closures", range);
}
