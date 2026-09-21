import type { AgentVoice, AgentVoiceInput } from "@/modules/agents/domain/agent";

/**
 * La voz del agente en el formulario (estudio de agentes). Antes vivía en el
 * character (`CharacterForm.buildVoiceDto`); ahora la voz es de cada agente.
 * Dominio PURO: sin React ni http.
 */
export const VOICE_SETTING_DEFAULTS = { stability: 0.5, similarity_boost: 0.75, speed: 1 } as const;

export const VOICE_SETTING_RANGES = {
  stability: { min: 0, max: 1, step: 0.05 },
  similarity_boost: { min: 0, max: 1, step: 0.05 },
  speed: { min: 0.7, max: 1.2, step: 0.05 },
} as const;

export type VoiceFormValues = {
  /** `external_voice_id` elegido; `""` = sin voz (responde solo texto). */
  voice_id: string;
  stability: number;
  similarity_boost: number;
  speed: number;
};

/** Lo guardado → valores del form (defaults donde el agente no fijó nada). */
export function voiceFormValues(existing: AgentVoice | null | undefined): VoiceFormValues {
  // La vista trae `settings` como record: se lee con guardas, nunca se confía en la forma
  const settings = (existing?.settings ?? {}) as Record<string, unknown>;
  const num = (key: keyof typeof VOICE_SETTING_DEFAULTS): number => {
    const value = settings[key];
    return typeof value === "number" ? value : VOICE_SETTING_DEFAULTS[key];
  };
  return {
    voice_id: existing?.voice_id ?? "",
    stability: num("stability"),
    similarity_boost: num("similarity_boost"),
    speed: num("speed"),
  };
}

/**
 * `voice` del DTO. El contrato es ESTRICTO (el catálogo curado es invariante
 * del servidor): se envían EXACTAMENTE las claves del schema. Se preservan
 * `model_id` y `settings.style` existentes porque el form no los edita.
 * Devuelve `undefined` cuando no hay nada que tocar (sin voz antes ni ahora) y
 * `{}` para quitar la voz.
 */
export function buildVoiceDto(
  values: VoiceFormValues,
  existing: AgentVoice | null | undefined,
): AgentVoiceInput | undefined {
  if (values.voice_id === "") {
    return existing?.voice_id ? {} : undefined;
  }
  const existingSettings = (existing?.settings ?? {}) as Record<string, unknown>;
  return {
    provider: "elevenlabs",
    voice_id: values.voice_id,
    ...(typeof existing?.model_id === "string" ? { model_id: existing.model_id } : {}),
    settings: {
      ...(typeof existingSettings.style === "number" ? { style: existingSettings.style } : {}),
      stability: values.stability,
      similarity_boost: values.similarity_boost,
      speed: values.speed,
    },
  };
}
