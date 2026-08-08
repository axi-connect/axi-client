import { http } from "@/core/services/http";
import type { Params } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type {
  CreateReminderDTO,
  ListRemindersParams,
  ReminderDTO,
  UpdateReminderDTO,
} from "@/modules/scheduling/domain/reminder";

/**
 * Adapter HTTP de recordatorios → `/scheduling/reminders`.
 * `is_active` viaja como string "true"/"false" (así lo tipa el backend).
 */
export async function listReminders(params: ListRemindersParams = {}): Promise<ReminderDTO[]> {
  const query: Params = { contact_id: params.contact_id };
  if (params.is_active !== undefined) query.is_active = String(params.is_active);
  const res = await http.get<Schemas["RemindersListDto"]>("/scheduling/reminders", query);
  return res.data;
}

export function createReminder(dto: CreateReminderDTO): Promise<ReminderDTO> {
  return http.post<ReminderDTO>("/scheduling/reminders", dto);
}

/** PATCH de `schedule_rrule`/`timezone` recalcula `next_run_at` solo (no mandarlo). */
export function updateReminder(id: string, dto: UpdateReminderDTO): Promise<ReminderDTO> {
  return http.patch<ReminderDTO>(`/scheduling/reminders/${id}`, dto);
}

/** Borrado físico (204). */
export function deleteReminder(id: string): Promise<void> {
  return http.delete<void>(`/scheduling/reminders/${id}`);
}
