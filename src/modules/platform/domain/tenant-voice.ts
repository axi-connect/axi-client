import type { Schemas } from "@/core/api/types";

/**
 * Voz de un tenant vista desde la consola (gobierno de la voz, 2026-09-21):
 * el interruptor de empresa, el plan como CONTEXTO (no bloquea nada: la llave
 * la pega axi, V5), si hay llave propia de ElevenLabs y el consumo del ciclo.
 */
export type TenantVoiceDTO = Schemas["PlatformTenantVoiceDto"];
export type TenantVoiceUsage = NonNullable<TenantVoiceDTO["usage"]>;

/** Misma regla de color que la barra del dashboard del tenant: ≥ 100 % agotada, ≥ 80 % aviso. */
export function voiceUsageTone(usage: TenantVoiceUsage): "ok" | "warning" | "off" {
  if (usage.pct_used === null) return "off";
  if (usage.pct_used >= 100) return "off";
  if (usage.pct_used >= 80) return "warning";
  return "ok";
}

/** «178.400 / 300.000 caracteres · 59 %» o, sin límite propio, «12.480 caracteres · sin límite propio». */
export function voiceUsageLabel(usage: TenantVoiceUsage): string {
  const used = usage.used.toLocaleString("es-CO");
  if (usage.limit === null || usage.pct_used === null) return `${used} caracteres · sin límite propio de voz`;
  return `${used} / ${usage.limit.toLocaleString("es-CO")} caracteres · ${String(Math.round(usage.pct_used))} %`;
}

export const PLAN_TIER_LABELS: Record<"sbs" | "enterprise", string> = {
  sbs: "SBS",
  enterprise: "Enterprise",
};
