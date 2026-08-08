import { http } from "@/core/services/http";
import type { Params } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  AppointmentDTO,
  CancelAppointmentDTO,
  CreateAppointmentDTO,
  ListAppointmentsParams,
  UpdateAppointmentDTO,
} from "@/modules/scheduling/domain/appointment";

/**
 * Adapter HTTP de citas → `/scheduling/appointments`.
 * Sin paginación: el rango `from`/`to` (máx 92 días) es el paginador.
 */
export async function listAppointments(
  params: ListAppointmentsParams,
): Promise<AppointmentDTO[]> {
  const res = await http.get<Schemas["AppointmentsListDto"]>(
    "/scheduling/appointments",
    params as Params,
  );
  return res.data;
}

export function getAppointment(id: string): Promise<AppointmentDTO> {
  return http.get<AppointmentDTO>(`/scheduling/appointments/${id}`);
}

/** Cita manual del operador (off-grid permitido); 409 `scheduling/slot_unavailable` si el cupo se llenó. */
export function createAppointment(dto: CreateAppointmentDTO): Promise<AppointmentDTO> {
  return http.post<AppointmentDTO>("/scheduling/appointments", dto);
}

/** Cambiar `starts_at` = reagendar: revalida capacity y regenera recordatorios automáticos. */
export function updateAppointment(
  id: string,
  dto: UpdateAppointmentDTO,
): Promise<AppointmentDTO> {
  return http.patch<AppointmentDTO>(`/scheduling/appointments/${id}`, dto);
}

/** Cancelar va SIEMPRE por aquí, nunca por PATCH de status. */
export function cancelAppointment(
  id: string,
  dto: CancelAppointmentDTO = {},
): Promise<AppointmentDTO> {
  return http.post<AppointmentDTO>(`/scheduling/appointments/${id}/cancel`, dto);
}
