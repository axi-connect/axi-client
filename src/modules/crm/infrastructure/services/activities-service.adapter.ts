import { http } from "@/core/services/http";
import type { Paginated } from "@/core/api/types";
import type {
  ActivityDTO,
  CreateActivityDTO,
  CreateAgentTaskDTO,
  ListActivitiesParams,
  ListTasksParams,
  TaskStatsDTO,
  UpdateActivityDTO,
  UpdateAgentTaskDTO,
} from "@/modules/crm/domain/activity";
import type { TaskRunDTO } from "@/modules/crm/domain/task-execution";

import type { OffsetQuery } from "@/core/api/types";

export type ListTaskRunsParams = OffsetQuery & {
  status?: NonNullable<ActivityDTO["last_run_status"]>;
  reason?: string;
  from?: string;
  to?: string;
};

/**
 * Adapter HTTP de actividades y tareas. ÚNICO punto de creación/edición de
 * tareas (POST/PATCH `/crm/activities` con `kind: task` — no existe
 * POST /crm/tasks). El `kind` es inmutable tras crear.
 */
export function listActivities(
  params: ListActivitiesParams = {},
): Promise<Paginated<ActivityDTO>> {
  return http.get<Paginated<ActivityDTO>>("/crm/activities", params);
}

/** Tarea: exige `due_at`; 422 `crm/invalid_task_fields` si el kind no aplica. */
export function createActivity(dto: CreateActivityDTO): Promise<ActivityDTO> {
  return http.post<ActivityDTO>("/crm/activities", dto);
}

export function updateActivity(id: string, dto: UpdateActivityDTO): Promise<ActivityDTO> {
  return http.patch<ActivityDTO>(`/crm/activities/${id}`, dto);
}

export function deleteActivity(id: string): Promise<void> {
  return http.delete<void>(`/crm/activities/${id}`);
}

/** Una tarea por id: el enlace profundo de la edición no trae la fila. */
export function getTask(id: string): Promise<ActivityDTO> {
  return http.get<ActivityDTO>(`/crm/tasks/${id}`);
}

/** Bandeja de lectura (`orden due_at asc`); las filas son ActivityDTO. */
export function listTasks(params: ListTasksParams = {}): Promise<Paginated<ActivityDTO>> {
  return http.get<Paginated<ActivityDTO>>("/crm/tasks", params);
}

/** Del solicitante: `{open, overdue, due_today, unassigned}`. */
export function getTaskStats(): Promise<TaskStatsDTO> {
  return http.get<TaskStatsDTO>("/crm/tasks/stats");
}

// Idempotentes; sobre una nota → 409 `crm/not_a_task`.
export function completeTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/complete`, {});
}

export function reopenTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/reopen`, {});
}

export function cancelTask(id: string): Promise<ActivityDTO> {
  return http.post<ActivityDTO>(`/crm/tasks/${id}/cancel`, {});
}

/* ─────────────────── Tareas de agente ──────────────────────────────────── */

/**
 * Alta de una tarea que ejecuta un agente. Superficie APARTE de
 * `/crm/activities` porque el permiso es distinto (`crm:automate`): crear una
 * nota y programar un mensaje de la IA a un cliente no son lo mismo. Enviar
 * `assignee_type: "agent"` a `/crm/activities` devuelve 400
 * `crm/agent_task_wrong_endpoint`.
 */
export function createAgentTask(dto: CreateAgentTaskDTO): Promise<ActivityDTO> {
  return http.post<ActivityDTO>("/crm/agent-tasks", dto);
}

/** Reprogramar mueve `due_at` y `next_run_at` a la vez y reinicia los intentos. */
export function updateAgentTask(id: string, dto: UpdateAgentTaskDTO): Promise<ActivityDTO> {
  return http.patch<ActivityDTO>(`/crm/agent-tasks/${id}`, dto);
}

/**
 * Adelanta la tarea a «ahora». Responde 202: aceptada, no enviada.
 *
 * Es un bypass del RELOJ, no del anti-spam — el backend vuelve a pasar todos
 * los guards (opt-out, horario, cupo, throttle), así que puede acabar en
 * diferida igual que una ejecución programada.
 */
export function runAgentTaskNow(id: string): Promise<void> {
  return http.post<void>(`/crm/agent-tasks/${id}/run-now`, {});
}

/** Historial de intentos de UNA tarea: alimenta el rail de ejecución. */
export function listTaskRuns(id: string): Promise<{ data: TaskRunDTO[] }> {
  return http.get<{ data: TaskRunDTO[] }>(`/crm/agent-tasks/${id}/runs`);
}

/** Feed del tenant: el «¿por qué no salió mi mensaje?» transversal. */
export function listAllTaskRuns(params: ListTaskRunsParams = {}): Promise<Paginated<TaskRunDTO>> {
  return http.get<Paginated<TaskRunDTO>>("/crm/task-runs", params);
}
