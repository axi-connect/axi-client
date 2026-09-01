/**
 * Superficie pública del slice `agents` (§3.3 regla 5).
 *
 * Nace porque `crm` necesita ofrecer un selector de agente para las tareas que
 * ejecuta la IA, y hasta ahora el único consumidor cross-slice de `listAgents()`
 * —`channels/ui/forms/ChannelForm.tsx`— importaba el adapter por su ruta
 * interna, que es exactamente lo que esta regla prohíbe. Ese caso queda como
 * deuda anotada: migrarlo aquí es un cambio de import, pero no es de este PR.
 *
 * Se publican tipos y datos, no componentes: lo que entra aquí queda acoplado.
 */

export type {
  AgentStatus,
  AiAgentListItemDTO,
} from "@/modules/agents/domain/agent";
export { AGENT_STATUS_LABELS } from "@/modules/agents/domain/agent";

export {
  clearTenantAgentsCache,
  getTenantAgentNames,
  getTenantAgents,
  type AssignableAgent,
} from "@/modules/agents/infrastructure/services/tenant-agents.cache";
