"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import type { AgentRow } from "@/modules/agents/domain/agent";
import type { CharacterDTO } from "@/modules/agents/domain/character";
import { DataTable } from "@/shared/components/features/data-table";
import { useAgent } from "@/modules/agents/infrastructure/stores/agent.context";
import { useAgentStore } from "@/modules/agents/infrastructure/stores/agent.store";
import { agentColumns } from "@/modules/agents/ui/tables/config/agent.config";
import CharacterGallery from "@/modules/agents/ui/components/CharacterGallery";
import AgentDetailSheet from "@/modules/agents/ui/components/AgentDetailSheet";
import { AgentContextMenuItems } from "@/modules/agents/ui/tables/agent.actions";
import { deleteAgent } from "@/modules/agents/infrastructure/services/agent-service.adapter";

/**
 * Agentes IA (`/ai-agents`) + galería de characters (`/ai-characters`).
 * Crear/editar abren modales por ruta interceptada (@form), así la URL es
 * compartible y el back del navegador cierra el modal.
 */
export default function AgentsPage() {
  const pageSize = 10;
  const router = useRouter();
  const { showAlert, showModal, closeModal } = useAlert();
  const { agents, characters, fetchAgents, fetchCharacters, setSelectedCharacter } = useAgent();
  const [agentRows, setAgentRows] = useState<AgentRow[]>([]);

  const onEditCharacter = (character: CharacterDTO) => {
    setSelectedCharacter(character);
    router.push(`/admin/agents/characters/update/${character.id}`);
  };

  const handleDeleteAgent = async (row: AgentRow) => {
    try {
      await deleteAgent(row.id);
      await fetchAgents();
      showAlert({ tone: "success", title: "Agente eliminado correctamente", open: true });
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el agente") });
    } finally {
      closeModal();
    }
  };

  useEffect(() => {
    void fetchAgents();
    void fetchCharacters();

    useAgentStore.setState({
      actions: {
        onView: (row) => window.dispatchEvent(new CustomEvent("agents:view:open", { detail: { id: row.id } })),
        onEdit: (row) => router.push(`/admin/agents/update/${row.id}`),
        onDelete: (row) =>
          showModal({
            title: "Eliminar agente",
            description: `¿Seguro que deseas eliminar el agente “${row.name}”?`,
            actions: [
              { label: "Cancelar", variant: "outline", asClose: true, id: "agents-delete-cancel" },
              { label: "Eliminar", variant: "destructive", asClose: false, onClick: () => void handleDeleteAgent(row), id: "agents-delete-confirm" },
            ],
            className: "sm:max-w-md",
          }),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAgentRows(
      agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        provider: agent.provider,
        model: agent.model,
        character_id: agent.character_id,
        intentions_count: agent.intentions.length,
      })),
    );
  }, [agents]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Galería de characters</h2>
          <p className="text-sm text-muted-foreground">
            La personalidad visual de tus agentes. Las plantillas del sistema no se pueden modificar.
          </p>
        </div>
        <Button
          variant="default"
          className="rounded-full"
          onClick={() => router.push("/admin/agents/characters/create")}
        >
          <Plus className="h-4 w-4" />
          Crear character
        </Button>
      </div>

      <CharacterGallery
        characters={characters}
        onEdit={onEditCharacter}
        onDeleted={() => {
          void fetchCharacters();
          showAlert({ tone: "success", title: "Character eliminado", open: true });
        }}
        onError={(message) => showAlert({ tone: "error", title: message })}
      />

      <div className="mt-12 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl tracking-tight font-semibold">Agentes</h1>
            <p className="text-sm text-muted-foreground">
              Configura los agentes IA que atienden tus canales.
            </p>
          </div>
          <Button
            variant="default"
            className="rounded-full"
            onClick={() => router.push("/admin/agents/create")}
          >
            <Plus className="h-4 w-4" />
            Crear agente
          </Button>
        </div>

        <DataTable<AgentRow>
          data={agentRows}
          columns={agentColumns}
          pagination={{ pageSize }}
          rowContextMenu={({ row }) => <AgentContextMenuItems row={row} />}
        />

        <AgentDetailSheet />
      </div>
    </div>
  );
}
