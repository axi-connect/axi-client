import { http } from "@/core/services/http";
import type { AgentTaskSettings } from "@/modules/crm/domain/agent-task-settings";

/**
 * Política del motor de tareas de agente.
 *
 * El PUT manda la SECCIÓN COMPLETA, no un parche: el backend reemplaza
 * `settings.crm.agent_tasks` entera, así que omitir un campo lo devolvería a su
 * default en silencio. Por eso el formulario siempre parte de lo que devolvió
 * el GET y nunca de defaults locales.
 *
 * Leer exige `crm:read`; escribir, `crm:automate`.
 */
export function getAgentTaskSettings(): Promise<AgentTaskSettings> {
  return http.get<AgentTaskSettings>("/crm/settings/agent-tasks");
}

export function putAgentTaskSettings(
  settings: AgentTaskSettings,
): Promise<AgentTaskSettings> {
  return http.put<AgentTaskSettings>("/crm/settings/agent-tasks", settings);
}
