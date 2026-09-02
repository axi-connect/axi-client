import { http } from "@/core/services/http";
import type { AiAgentDTO } from "@/modules/agents/public";
import type { AgentTemplateDTO, CreateAgentFromTemplateDTO } from "@/modules/onboarding/domain/agent-templates";

/** Adapter HTTP de las plantillas de agente por nicho (contrato B3). */
export async function listAgentTemplates(nicheCode: string): Promise<AgentTemplateDTO[]> {
  const response = await http.get<{ data: AgentTemplateDTO[] }>(
    `/onboarding/niches/${encodeURIComponent(nicheCode)}/agent-templates`,
  );
  return response.data;
}

/** 201: el servidor renderiza el prompt, crea el agente, liga intenciones y siembra el manual de ventas. */
export function createAgentFromTemplate(dto: CreateAgentFromTemplateDTO): Promise<AiAgentDTO> {
  return http.post<AiAgentDTO>("/onboarding/agents/from-template", dto);
}
