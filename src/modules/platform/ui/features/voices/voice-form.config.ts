/**
 * Schema del formulario de voz del catálogo (§10.5, /platform/voices).
 * Los ajustes van APLANADOS (sliders numéricos) y se re-anidan en los
 * mappers; `style` no se edita aquí pero se PRESERVA en el update (enviar
 * default_settings reemplaza el JSON completo — mismo cuidado que
 * buildVoiceDto en CharacterForm).
 */
import { z } from "zod";
import type { CreateVoiceDTO, PlatformVoice, UpdateVoiceDTO } from "../../../domain/voices";

/** Default de la frase de la muestra — espejo de BRAND_PHRASE del backend
 * (la fuente de verdad operativa es `ai_voice.preview_text` por voz). */
export const DEFAULT_SAMPLE_PHRASE = "Hola, soy tu asesor de Axi. ¿En qué te puedo ayudar hoy?";

export const SAMPLE_PHRASE_MAX = 500;

export const voiceFormSchema = z.object({
  external_voice_id: z
    .string()
    .trim()
    .min(1, "Cópialo de la librería de voces de ElevenLabs")
    .max(120),
  name: z.string().trim().min(1, "El tenant necesita un nombre en el selector").max(120),
  description: z.string().max(500),
  gender: z.enum(["female", "male", "none"]),
  accent: z.string().max(40),
  default_model_id: z.string().trim().min(1, "El modelo con el que sintetiza esta voz").max(120),
  stability: z.coerce.number().min(0).max(1),
  similarity_boost: z.coerce.number().min(0).max(1),
  speed: z.coerce.number().min(0.5).max(2),
  /** Form-only: viaja al endpoint de preview, no al create/update. */
  sample_phrase: z
    .string()
    .trim()
    .min(1, "Es lo que oye el tenant al probar la voz")
    .max(SAMPLE_PHRASE_MAX),
});

export type VoiceFormValues = z.infer<typeof voiceFormSchema>;

export const defaultVoiceFormValues: VoiceFormValues = {
  external_voice_id: "",
  name: "",
  description: "",
  gender: "female",
  accent: "es-latam",
  default_model_id: "eleven_flash_v2_5",
  stability: 0.5,
  similarity_boost: 0.75,
  speed: 1,
  sample_phrase: DEFAULT_SAMPLE_PHRASE,
};

export function voiceToFormValues(voice: PlatformVoice): VoiceFormValues {
  const settings = voice.default_settings;
  return {
    external_voice_id: voice.external_voice_id,
    name: voice.name,
    description: voice.description ?? "",
    gender: voice.gender === "male" || voice.gender === "female" ? voice.gender : "none",
    accent: voice.accent ?? "",
    default_model_id: voice.default_model_id,
    stability: settings.stability ?? defaultVoiceFormValues.stability,
    similarity_boost: settings.similarity_boost ?? defaultVoiceFormValues.similarity_boost,
    speed: settings.speed ?? defaultVoiceFormValues.speed,
    sample_phrase: voice.preview_text ?? DEFAULT_SAMPLE_PHRASE,
  };
}

function settingsFrom(values: VoiceFormValues, current?: PlatformVoice): CreateVoiceDTO["default_settings"] {
  return {
    stability: values.stability,
    similarity_boost: values.similarity_boost,
    speed: values.speed,
    // `style` no tiene slider: se preserva el curado existente en vez de
    // borrarlo con el replace del JSON
    ...(current?.default_settings.style === undefined ? {} : { style: current.default_settings.style }),
  };
}

export function toCreateVoiceDTO(values: VoiceFormValues): CreateVoiceDTO {
  return {
    provider: "elevenlabs",
    external_voice_id: values.external_voice_id.trim(),
    name: values.name.trim(),
    description: values.description.trim() === "" ? null : values.description.trim(),
    gender: values.gender === "none" ? null : values.gender,
    accent: values.accent.trim() === "" ? null : values.accent.trim(),
    default_model_id: values.default_model_id.trim(),
    default_settings: settingsFrom(values),
  };
}

/** La identidad (provider, external_voice_id) NO viaja: es inmutable. */
export function toUpdateVoiceDTO(values: VoiceFormValues, current: PlatformVoice): UpdateVoiceDTO {
  return {
    name: values.name.trim(),
    description: values.description.trim() === "" ? null : values.description.trim(),
    gender: values.gender === "none" ? null : values.gender,
    accent: values.accent.trim() === "" ? null : values.accent.trim(),
    default_model_id: values.default_model_id.trim(),
    default_settings: settingsFrom(values, current),
  };
}
