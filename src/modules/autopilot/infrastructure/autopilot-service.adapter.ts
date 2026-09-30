import { HttpError } from "@/core/api/problem";
import { http } from "@/core/services/http";

import type {
  BatchItem,
  Estimate,
  Routine,
  RoutineInput,
  RoutineListItem,
  RunDetail,
  RunEvent,
  RunSummary,
} from "../domain/autopilot";

/** Adapter HTTP del slice autopilot del servidor (P4) → `/autopilot/*`. */

export function listRoutines(): Promise<{ items: RoutineListItem[] }> {
  return http.get("/autopilot/routines");
}

export function getRoutine(id: string): Promise<Routine> {
  return http.get(`/autopilot/routines/${encodeURIComponent(id)}`);
}

export function createRoutine(input: RoutineInput): Promise<{ id: string }> {
  return http.post("/autopilot/routines", input);
}

export function updateRoutine(id: string, input: RoutineInput): Promise<Routine> {
  return http.put(`/autopilot/routines/${encodeURIComponent(id)}`, input);
}

export function deleteRoutine(id: string): Promise<void> {
  return http.delete(`/autopilot/routines/${encodeURIComponent(id)}`);
}

export function pauseRoutine(id: string): Promise<{ run_id?: string }> {
  return http.post(`/autopilot/routines/${encodeURIComponent(id)}/pause`, {});
}

export function resumeRoutine(id: string): Promise<{ run_id?: string }> {
  return http.post(`/autopilot/routines/${encodeURIComponent(id)}/resume`, {});
}

export function runRoutineNow(id: string): Promise<{ run_id?: string }> {
  return http.post(`/autopilot/routines/${encodeURIComponent(id)}/run-now`, {});
}

export function listRuns(routineId: string, cursor?: string): Promise<{ items: RunSummary[]; next_cursor: string | null }> {
  return http.get(`/autopilot/routines/${encodeURIComponent(routineId)}/runs`, cursor === undefined ? undefined : { cursor });
}

export function getRun(runId: string): Promise<RunDetail> {
  return http.get(`/autopilot/runs/${encodeURIComponent(runId)}`);
}

export function listRunEvents(runId: string, after?: string): Promise<{ items: RunEvent[] }> {
  return http.get(`/autopilot/runs/${encodeURIComponent(runId)}/events`, after === undefined ? undefined : { after });
}

export function getBatch(runId: string): Promise<{ items: BatchItem[] }> {
  return http.get(`/autopilot/runs/${encodeURIComponent(runId)}/batch`);
}

export function decideBatch(runId: string, decision: { approve: string[]; skip: string[] }): Promise<void> {
  return http.post(`/autopilot/runs/${encodeURIComponent(runId)}/batch`, decision);
}

export function estimateRoutine(input: RoutineInput): Promise<Estimate> {
  return http.post("/autopilot/estimate", input);
}

/**
 * El servidor todavía no trae el piloto (P4 sin desplegar): la vista lo dice
 * con calma en vez de mostrar un error. Un 404 en la LISTA es exactamente eso.
 */
export function isAutopilotUnavailable(error: unknown): boolean {
  return error instanceof HttpError && error.status === 404;
}
