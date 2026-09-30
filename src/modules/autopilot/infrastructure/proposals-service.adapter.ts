import { http } from "@/core/services/http";

import type { PilotApprovalDTO, PilotProposalDTO } from "../domain/proposals";

/** «Axi propone» del piloto (P6b): `/autopilot/proposals` (bandeja `source: autopilot`). */

export function listPilotProposals(): Promise<{ data: PilotProposalDTO[] }> {
  return http.get("/autopilot/proposals");
}

export function approvePilotProposal(id: string): Promise<PilotApprovalDTO> {
  return http.post(`/autopilot/proposals/${encodeURIComponent(id)}/approve`, {});
}

export function rejectPilotProposal(
  id: string,
  input: { reason?: string; save_as_directive?: boolean },
): Promise<{ directive_created: boolean }> {
  return http.post(`/autopilot/proposals/${encodeURIComponent(id)}/reject`, input);
}
