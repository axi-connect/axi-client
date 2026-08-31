import { listAgents } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import type { AiAgentListItemDTO } from "@/modules/agents/domain/agent";

/**
 * Caché de los agentes del tenant a nivel de módulo (espejo de
 * `tenant-users.cache.ts` del CRM).
 *
 * `/ai-agents` no acepta filtros y varios consumidores lo necesitan a la vez:
 * el selector de agente del formulario de tareas, y las vistas que hidratan un
 * `assigned_agent_id` crudo a un nombre. Se pide **una vez por sesión** en vez
 * de una por apertura de modal.
 *
 * Se cachea la PROMESA, no el resultado: dos consumidores que monten en el
 * mismo tick comparten la petición en vuelo. Un fallo NO se cachea — el
 * siguiente reintenta.
 */

export type AssignableAgent = Pick<AiAgentListItemDTO, "id" | "name" | "status">;

let agentsPromise: Promise<AssignableAgent[]> | null = null;

/**
 * Agentes ASIGNABLES: solo los `active`.
 *
 * Un agente `paused` o `draft` no ejecuta, y el backend rechaza la tarea con
 * `crm/agent_not_active`. Ofrecerlo en el selector sería prometer algo que va a
 * fallar al guardar.
 */
export function getTenantAgents(): Promise<AssignableAgent[]> {
  agentsPromise ??= listAgents()
    .then((response) =>
      response.data
        .filter((agent) => agent.status === "active")
        .map(({ id, name, status }) => ({ id, name, status })),
    )
    .catch((error: unknown) => {
      agentsPromise = null;
      throw error;
    });
  return agentsPromise;
}

/**
 * Mapa `id → nombre` para hidratar los `assigned_agent_id` crudos de los DTO.
 * Degrada a un mapa vacío: no poder resolver un nombre nunca debe romper la
 * bandeja que lo pinta.
 */
export function getTenantAgentNames(): Promise<Map<string, string>> {
  return getTenantAgents()
    .then((agents) => new Map(agents.map((agent) => [agent.id, agent.name])))
    .catch(() => new Map<string, string>());
}

/** Solo para tests: descarta la caché compartida. */
export function clearTenantAgentsCache(): void {
  agentsPromise = null;
}
