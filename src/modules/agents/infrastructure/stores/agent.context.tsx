"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type { AiAgentListItemDTO } from "@/modules/agents/domain/agent";
import type { CharacterDTO } from "@/modules/agents/domain/character";
import type { IntentionDTO } from "@/modules/agents/domain/intentions";
import type { AiVoiceDTO, VoiceSettingsDTO } from "@/modules/agents/domain/voice";
import { listAgents } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import { listCharacters } from "@/modules/agents/infrastructure/services/character-service.adapter";
import { listIntentions } from "@/modules/agents/infrastructure/services/intention-service.adapter";
import {
  getVoiceSettings,
  listAiVoices,
} from "@/modules/agents/infrastructure/services/voice-service.adapter";

/**
 * Provider del segmento `/ai-agents`: comparte agentes, characters e
 * intenciones entre la página y los modales interceptados (@form).
 * Las colecciones no paginan en el servidor (tenant-scoped, sets pequeños).
 *
 * Voz (§10.5 F2): `voices` es el catálogo curado (`null` = aún sin cargar —
 * los `preview_url` presignados caducan en 1 h, por eso `fetchVoices` se llama
 * al ABRIR el form y siempre re-fetchea). `voiceSettings` es el switch de la
 * empresa; los forms lo usan para deshabilitar (nunca ocultar) la sección de
 * voz cuando está apagado.
 */
type AgentContextValue = {
  error: string | null;
  agents: AiAgentListItemDTO[];
  characters: CharacterDTO[];
  intentions: IntentionDTO[];
  voices: AiVoiceDTO[] | null;
  voiceSettings: VoiceSettingsDTO | null;
  fetchAgents: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  fetchIntentions: () => Promise<void>;
  fetchVoices: () => Promise<void>;
  fetchVoiceSettings: () => Promise<void>;
  selectedCharacter: CharacterDTO | null;
  setSelectedCharacter: (character: CharacterDTO | null) => void;
};

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AiAgentListItemDTO[]>([]);
  const [characters, setCharacters] = useState<CharacterDTO[]>([]);
  const [intentions, setIntentions] = useState<IntentionDTO[]>([]);
  const [voices, setVoices] = useState<AiVoiceDTO[] | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsDTO | null>(null);
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

  // Sin setError: la voz es opcional y su fallo no debe tapar el resto del
  // panel. `[]` = catálogo vacío/inaccesible; el selector lo explica in situ.
  const fetchVoices = useCallback(async () => {
    try {
      const res = await listAiVoices();
      setVoices(res.data);
    } catch {
      setVoices([]);
    }
  }, []);

  const fetchVoiceSettings = useCallback(async () => {
    try {
      setVoiceSettings(await getVoiceSettings());
    } catch {
      // Desconocido ≠ apagado: los forms no bloquean la sección sin saber
      setVoiceSettings(null);
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        error,
        agents,
        characters,
        intentions,
        voices,
        voiceSettings,
        fetchAgents,
        fetchCharacters,
        fetchIntentions,
        fetchVoices,
        fetchVoiceSettings,
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
