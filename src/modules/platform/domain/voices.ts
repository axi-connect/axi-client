import type { Schemas } from "@/core/api/types";

/**
 * Curaduría del catálogo de voces (§10.5, /platform/voices). El catálogo es
 * GLOBAL: lo que se cura aquí es exactamente lo que ven todos los tenants en
 * el selector de voz de sus characters, en este mismo orden.
 */
export type PlatformVoice = Schemas["PlatformAiVoiceListDto"]["data"][number];
export type CreateVoiceDTO = Schemas["CreateAiVoiceDto"];
export type UpdateVoiceDTO = Schemas["UpdateAiVoiceDto"];
export type VoiceSettingsDTO = NonNullable<CreateVoiceDTO["default_settings"]>;

/** Misma convención que agents/domain/voice.ts — un gender desconocido se
 * muestra tal cual, jamás se oculta. */
export const VOICE_GENDER_LABELS: Record<string, string> = {
  female: "Femenina",
  male: "Masculina",
};

export function voiceGenderLabel(gender: string | null): string | null {
  if (gender === null) return null;
  return VOICE_GENDER_LABELS[gender] ?? gender;
}

/** La muestra quedó atrás respecto a la curaduría: se editó la voz (settings,
 * modelo…) después de generarla. Sin muestra no hay desactualización que
 * avisar — el estado "pendiente" ya lo dice el botón. */
export function voicePreviewStale(voice: PlatformVoice): boolean {
  if (voice.preview_generated_at === null) return false;
  return new Date(voice.updated_at).getTime() > new Date(voice.preview_generated_at).getTime();
}

/**
 * Mueve una voz un puesto arriba/abajo — la ÚNICA implementación del invariante
 * de orden (misma semántica arrayMove que suite-scenarios.helpers): las flechas
 * y cualquier control futuro comparten esta función para no divergir.
 * Fuera de rango devuelve el MISMO array (los botones de borde van disabled,
 * pero un doble click rápido no debe corromper el orden).
 */
export function moveVoice(ids: readonly string[], index: number, direction: "up" | "down"): string[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return [...ids];
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved);
  return next;
}
