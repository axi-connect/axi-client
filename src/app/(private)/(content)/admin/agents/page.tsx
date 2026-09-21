import { AgentsGridView } from "@/modules/agents/ui/AgentsGridView";

/**
 * Agentes IA (`/ai-agents` → `/admin/agents`): la rejilla. Crear y editar son
 * páginas completas (`/new`, `/[id]`): el estudio necesita el ancho entero.
 */
export default function AgentsPage() {
  return <AgentsGridView />;
}
