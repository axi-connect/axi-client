import { http } from "@/core/services/http";

import type { PilotsSummaryDTO } from "../domain/summary";

/** GET /autopilot/summary: la ficha «Lo que trajeron los pilotos» (P6b). */
export function getPilotsSummary(): Promise<PilotsSummaryDTO> {
  return http.get<PilotsSummaryDTO>("/autopilot/summary");
}
