"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type { AiAgentListItemDTO } from "@/modules/agents/domain/agent";
import type { CharacterDTO } from "@/modules/agents/domain/character";
import type { IntentionDTO } from "@/modules/agents/domain/intentions";
import { listAgents } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import { listCharacters } from "@/modules/agents/infrastructure/services/character-service.adapter";
import { listIntentions } from "@/modules/agents/infrastructure/services/intention-service.adapter";

/**
 * Provider del segmento `/ai-agents`: comparte agentes, characters e
 * intenciones entre la página y los modales interceptados (@form).
 * Las colecciones no paginan en el servidor (tenant-scoped, sets pequeños).
 */
type AgentContextValue = {
  error: string | null;
  agents: AiAgentListItemDTO[];
  characters: CharacterDTO[];
  intentions: IntentionDTO[];
  fetchAgents: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  fetchIntentions: () => Promise<void>;
  selectedCharacter: CharacterDTO | null;
  setSelectedCharacter: (character: CharacterDTO | null) => void;
};

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AiAgentListItemDTO[]>([]);
  const [characters, setCharacters] = useState<CharacterDTO[]>([]);
  const [intentions, setIntentions] = useState<IntentionDTO[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterDTO | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await listAgents();
      setAgents(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los agentes"));
    }
  }, []);

  const fetchCharacters = useCallback(async () => {
    try {
      const res = await listCharacters();
      setCharacters(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los characters"));
    }
  }, []);

  const fetchIntentions = useCallback(async () => {
    try {
      const res = await listIntentions();
      setIntentions(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las intenciones"));
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        error,
        agents,
        characters,
        intentions,
        fetchAgents,
        fetchCharacters,
        fetchIntentions,
        selectedCharacter,
        setSelectedCharacter,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) throw new Error("useAgent debe usarse dentro de AgentsProvider");
  return context;
}
