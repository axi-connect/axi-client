import { http } from "@/core/services/http";
import type { ReadinessFindingDTO, ReadinessSummaryDTO } from "@/modules/agents/domain/readiness";

/** «Salud del agente» (F11 partes críticas): avisos de un agente. */
export async function getAgentReadiness(agentId: string): Promise<ReadinessFindingDTO[]> {
  const response = await http.get<{ findings: ReadinessFindingDTO[] }>(`/ai-agents/${agentId}/readiness`);
  return response.findings;
}

/** Cuántos avisos tiene cada agente, para la rejilla. */
export async function getAgentsReadiness(): Promise<ReadinessSummaryDTO[]> {
  const response = await http.get<{ data: ReadinessSummaryDTO[] }>("/ai-agents/readiness");
  return response.data;
}
