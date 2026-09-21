/**
 * Superficie pública del slice `agents` (§3.3 regla 5).
 *
 * Nace porque `crm` necesita ofrecer un selector de agente para las tareas que
 * ejecuta la IA, y hasta ahora el único consumidor cross-slice de `listAgents()`
 * —`channels/ui/forms/ChannelForm.tsx`— importaba el adapter por su ruta
 * interna, que es exactamente lo que esta regla prohíbe. Ese caso queda como
 * deuda anotada: migrarlo aquí es un cambio de import, pero no es de este PR.
 *
 * `onboarding` consume el PERFIL del agente (estudio de agentes, 2026-09-21):
 * el catálogo de personajes y la paleta como tipos y constantes, los dos
 * selectores presentacionales (`CharacterPicker`, `ColorPalette`) y el
 * selector de voz con el catálogo (`listAiVoices`). Ya no hay characters: el
 * personaje es un código de un catálogo en código, no una entidad del tenant.
 *
 * Lo que se publica queda acoplado: tipos y datos antes que componentes; los
 * componentes publicados son presentacionales puros (props, sin contexto del
 * slice), que es la condición del barrel.
 */

export type {
  AgentAppearance,
  AgentBrief,
  AgentBriefTone,
  AgentCharacter,
  AgentColor,
  AgentStatus,
  AgentVoiceInput,
  AiAgentDTO,
  AiAgentListItemDTO,
} from "@/modules/agents/domain/agent";
export {
  AGENT_CHARACTERS,
  AGENT_COLORS,
  AGENT_STATUS_LABELS,
  BRIEF_TONE_LABELS,
  BRIEF_TONES,
  CHARACTER_LABELS,
  COLOR_LABELS,
  DEFAULT_APPEARANCE,
} from "@/modules/agents/domain/agent";

export type { AiVoiceDTO } from "@/modules/agents/domain/voice";
export { listAiVoices } from "@/modules/agents/infrastructure/services/voice-service.adapter";

export {
  clearTenantAgentsCache,
  getTenantAgentNames,
  getTenantAgents,
  type AssignableAgent,
} from "@/modules/agents/infrastructure/services/tenant-agents.cache";

export { CharacterPicker, KIT_CHARACTER } from "@/modules/agents/ui/studio/CharacterPicker";
export { ColorPalette } from "@/modules/agents/ui/studio/ColorPalette";
export { VoiceSelector } from "@/modules/agents/ui/components/VoiceSelector";
