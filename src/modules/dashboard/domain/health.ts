/**
 * Derivación pura del "estado del sistema" para la tarjeta de salud del
 * dashboard: combina el estado de los canales y el flag `ai_paused` del consumo
 * en un nivel semántico. TypeScript puro (sin React, sin http).
 */
import type { ChannelListDTO, UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";

export type HealthLevel = "ok" | "warning" | "critical";

export type ChannelHealth = {
  id: string;
  name: string;
  kind: string;
  status: string;
  level: HealthLevel;
};

const CHANNEL_STATUS_LEVEL: Record<string, HealthLevel> = {
  connected: "ok",
  connecting: "warning",
  pending_setup: "warning",
  disconnected: "critical",
  error: "critical",
};

export function channelLevel(status: string): HealthLevel {
  return CHANNEL_STATUS_LEVEL[status] ?? "warning";
}

/** Peor nivel de una lista (critical > warning > ok). */
export function worstLevel(levels: HealthLevel[]): HealthLevel {
  if (levels.includes("critical")) return "critical";
  if (levels.includes("warning")) return "warning";
  return "ok";
}

export function mapChannelsHealth(channels: ChannelListDTO): ChannelHealth[] {
  return channels.data.map((channel) => ({
    id: channel.id,
    name: channel.name,
    kind: channel.kind,
    status: channel.status,
    level: channelLevel(channel.status),
  }));
}

/**
 * Nivel global del sistema: el peor entre los canales y el estado de la IA
 * (pausada por límite de plan ⇒ warning).
 */
export function systemLevel(
  channels: ChannelHealth[],
  usage: UsageSummaryDTO | null,
): HealthLevel {
  const levels = channels.map((channel) => channel.level);
  if (usage?.ai_paused) levels.push("warning");
  return worstLevel(levels);
}
