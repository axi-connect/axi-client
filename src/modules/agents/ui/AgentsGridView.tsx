"use client";

import { Bot, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import type { AiAgentListItemDTO } from "@/modules/agents/domain/agent";
import { deleteAgent } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context";
import { AgentCard } from "@/modules/agents/ui/components/AgentCard";
import { KIT_CHARACTER } from "@/modules/agents/ui/studio/CharacterPicker";
import { AssistantAvatar, AssistantStage } from "@/shared/components/features/assistant";
import { EmptyState } from "@/shared/components/features/empty-state";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";

/**
 * `/admin/agents` (estudio de agentes, D5): la rejilla de agentes. Cada tarjeta
 * lleva al estudio (`/admin/agents/[id]`); crear va a `/admin/agents/new`. La
 * galería de characters y la tabla desaparecen: el personaje es parte del
 * agente, y su cara ya lo distingue en la rejilla.
 */
export function AgentsGridView() {
  const { agents, channels, error, fetchAgents, fetchChannels } = useAgent();
  const { showAlert, showModal, closeModal } = useAlert();

  useEffect(() => {
    void fetchAgents();
    void fetchChannels();
  }, [fetchAgents, fetchChannels]);

  const handleDelete = async (agent: AiAgentListItemDTO) => {
    try {
      await deleteAgent(agent.id);
      await fetchAgents();
      showAlert({ tone: "success", title: "Agente eliminado", open: true });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el agente") });
    } finally {
      closeModal();
    }
  };

  const confirmDelete = (agent: AiAgentListItemDTO) =>
    showModal({
      title: "Eliminar agente",
      description: `¿Seguro que deseas eliminar a “${agent.name}”? Los canales que lo usaban quedan sin agente predeterminado.`,
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "agents-delete-cancel" },
        { label: "Eliminar", variant: "destructive", asClose: false, onClick: () => void handleDelete(agent), id: "agents-delete-confirm" },
      ],
      className: "sm:max-w-md",
    });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Agentes"
        description="Cada agente tiene una cara, una voz y unas reglas. Los canales deciden con cuál atienden."
        actions={
          <Button asChild className="rounded-full">
            <Link href="/admin/agents/new">
              <Plus className="size-4" aria-hidden />
              Crear agente
            </Link>
          </Button>
        }
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {agents.length === 0 && !error ? (
        <EmptyState
          icon={Bot}
          accent="violet"
          variant="solid"
          title="Tu equipo empieza aquí"
          description="Elige un personaje, dale voz y cuéntale cómo atiende tu negocio. En cinco minutos está respondiendo."
          action={
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-end gap-1" aria-hidden>
                <AssistantStage className="[--stage-h:104px] [--stage-w:100px]">
                  <AssistantAvatar expression="neutral" character={KIT_CHARACTER.cloudee} color="cloud" transitionMs={0} />
                </AssistantStage>
                <AssistantStage className="[--stage-h:128px] [--stage-w:124px]">
                  <AssistantAvatar expression="proud" character={KIT_CHARACTER.nova} color="coral" transitionMs={0} />
                </AssistantStage>
                <AssistantStage className="[--stage-h:104px] [--stage-w:100px]">
                  <AssistantAvatar expression="curious" character={KIT_CHARACTER.strobi} color="mint" transitionMs={0} />
                </AssistantStage>
              </div>
              <Button asChild className="rounded-full">
                <Link href="/admin/agents/new">
                  <Plus className="size-4" aria-hidden />
                  Crear tu primer agente
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3" aria-label="Agentes">
          {agents.map((agent) => (
            <li key={agent.id} className="min-w-0">
              <AgentCard agent={agent} channels={channels} onDelete={confirmDelete} />
            </li>
          ))}
          <li className="min-w-0">
            <Link
              href="/admin/agents/new"
              className="flex min-h-[138px] flex-col items-center justify-center gap-1.5 rounded-[20px] border border-dashed border-border text-muted-foreground transition-colors hover:border-brand hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
                <Plus className="size-[18px]" aria-hidden />
              </span>
              <span className="text-sm font-semibold">Crear agente</span>
              <span className="text-xs">Personaje, voz y reglas en cinco minutos</span>
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}
