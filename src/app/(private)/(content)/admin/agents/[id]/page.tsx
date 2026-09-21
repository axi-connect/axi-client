import { AgentStudioView } from "@/modules/agents/ui/AgentStudioView";

/** Editar un agente: se entra directo al estudio editable (D5). */
export default async function EditAgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentStudioView mode="edit" agentId={id} />;
}
