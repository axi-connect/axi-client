"use client";

import { createContext, useCallback, useContext, useState } from "react";

import { errorMessage } from "@/core/lib/error-messages";
import { listChannels, type ChannelDTO } from "@/modules/channels/public";
import type { AiAgentListItemDTO, AiModelDTO } from "@/modules/agents/domain/agent";
import type { IntentionDTO } from "@/modules/agents/domain/intentions";
import type { AiVoiceDTO, VoiceSettingsDTO } from "@/modules/agents/domain/voice";
import { listAgents, listAiModels } from "@/modules/agents/infrastructure/services/agent-service.adapter";
import { listIntentions } from "@/modules/agents/infrastructure/services/intention-service.adapter";
import { getVoiceSettings, listAiVoices } from "@/modules/agents/infrastructure/services/voice-service.adapter";

/**
 * Provider del segmento `/admin/agents`: comparte agentes, intenciones, el
 * catálogo de modelos, los canales (para «canales que lo usan») y la voz entre
 * la rejilla y el estudio. Las colecciones no paginan en el servidor
 * (tenant-scoped, sets pequeños).
 *
 * Voz (§10.5): `voices` es el catálogo curado (`null` = aún sin cargar — los
 * `preview_url` presignados caducan en 1 h, por eso `fetchVoices` se llama al
 * ABRIR el estudio y siempre re-fetchea). `voiceSettings` es el switch de la
 * empresa; el estudio lo usa para deshabilitar (nunca ocultar) el bloque de voz
 * cuando está apagado.
 */
type AgentContextValue = {
  error: string | null;
  agents: AiAgentListItemDTO[];
  intentions: IntentionDTO[];
  models: AiModelDTO[] | null;
  channels: ChannelDTO[];
  voices: AiVoiceDTO[] | null;
  voiceSettings: VoiceSettingsDTO | null;
  fetchAgents: () => Promise<void>;
  fetchIntentions: () => Promise<void>;
  fetchModels: () => Promise<void>;
  fetchChannels: () => Promise<void>;
  fetchVoices: () => Promise<void>;
  fetchVoiceSettings: () => Promise<void>;
};

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<AiAgentListItemDTO[]>([]);
  const [intentions, setIntentions] = useState<IntentionDTO[]>([]);
  const [models, setModels] = useState<AiModelDTO[] | null>(null);
  const [channels, setChannels] = useState<ChannelDTO[]>([]);
  const [voices, setVoices] = useState<AiVoiceDTO[] | null>(null);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsDTO | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await listAgents();
      setAgents(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los agentes"));
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

  // Catálogo de modelos: lo sirve el backend desde las tarifas vigentes. Si
  // falla, `[]` — el estudio marca el modelo guardado como retirado en vez de
  // romper el form.
  const fetchModels = useCallback(async () => {
    try {
      const res = await listAiModels();
      setModels(res.data);
    } catch {
      setModels([]);
    }
  }, []);

  // Solo para «canales que lo usan»: informativo. Si falla, la fila queda
  // vacía; el binding real se hace desde Canales.
  const fetchChannels = useCallback(async () => {
    try {
      const res = await listChannels();
      setChannels(res.data);
    } catch {
      setChannels([]);
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
      // Desconocido ≠ apagado: el estudio no bloquea la sección sin saber
      setVoiceSettings(null);
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        error,
        agents,
        intentions,
        models,
        channels,
        voices,
        voiceSettings,
        fetchAgents,
        fetchIntentions,
        fetchModels,
        fetchChannels,
        fetchVoices,
        fetchVoiceSettings,
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
