import type { StatusMap } from "@/shared/components/features/status-badge/types";
import type { CampaignDTO, CampaignStatsDTO } from "./campaign";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "./enums";

/**
 * Máquina de estados de la campaña, en TypeScript puro y testeada aparte.
 *
 * Las acciones de la UI se derivan de estos predicados, NUNCA de un try/catch
 * contra el backend: un botón que solo falla al pulsarlo es un botón que
 * miente. El backend sigue siendo la autoridad (409 `campaign_not_editable`),
 * pero el panel no debe ofrecer lo que sabe que va a ser rechazado.
 *
 *   draft ──launch──> running ──(sin pendientes)──> completed
 *     │                  ↑│
 *     │ launch con       ││ pause
 *     │ scheduled_at     │↓
 *     └──> scheduled ──> paused ──resume──> running
 *   draft|scheduled|running|paused ──cancel──> cancelled
 */

/** Editar y borrar solo antes de lanzar: al lanzar se congela el snapshot. */
export function canEditCampaign(status: CampaignStatus): boolean {
  return status === "draft" || status === "scheduled";
}

export function canDeleteCampaign(status: CampaignStatus): boolean {
  return status === "draft";
}

export function canLaunchCampaign(status: CampaignStatus): boolean {
  return status === "draft";
}

export function canPauseCampaign(status: CampaignStatus): boolean {
  return status === "running";
}

export function canResumeCampaign(status: CampaignStatus): boolean {
  return status === "paused";
}

export function canCancelCampaign(status: CampaignStatus): boolean {
  return (
    status === "draft" ||
    status === "scheduled" ||
    status === "running" ||
    status === "paused"
  );
}

/** Terminal: ya no habrá más transiciones (las stats sí pueden moverse). */
export function isCampaignTerminal(status: CampaignStatus): boolean {
  return status === "completed" || status === "cancelled";
}

/** En vuelo: hay o habrá despacho. Es lo que el resumen muestra "en curso". */
export function isCampaignLive(status: CampaignStatus): boolean {
  return status === "running" || status === "paused" || status === "scheduled";
}

/**
 * Cada cuánto re-consultar las stats, en milisegundos, o `false` si no hay nada
 * que esperar. Función pura para poder testearla sin montar un hook.
 *
 * El WS es la señal PRIMARIA (`campaign_status_changed`, `campaign_progress`);
 * este polling solo cubre `delivered`/`read`, que el backend reconcilia por
 * lotes cada 5 minutos y NO publica como evento (decisión D6 del backend).
 * Por eso `completed` sigue refrescando: la campaña terminó de despacharse,
 * pero la entrega se sigue confirmando un buen rato después.
 */
export function campaignPollInterval(status: CampaignStatus): number | false {
  switch (status) {
    case "running":
      return 15_000;
    case "scheduled":
    case "paused":
    case "completed":
      return 60_000;
    case "draft":
    case "cancelled":
      return false;
  }
}

/** Semáforo del estado. `running` es el único transitorio: lleva spinner. */
export const CAMPAIGN_STATUS_MAP: StatusMap = {
  draft: { label: CAMPAIGN_STATUS_LABELS.draft, tone: "neutral" },
  scheduled: { label: CAMPAIGN_STATUS_LABELS.scheduled, tone: "info" },
  running: { label: CAMPAIGN_STATUS_LABELS.running, tone: "warning", transient: true },
  paused: { label: CAMPAIGN_STATUS_LABELS.paused, tone: "neutral" },
  completed: { label: CAMPAIGN_STATUS_LABELS.completed, tone: "success" },
  cancelled: { label: CAMPAIGN_STATUS_LABELS.cancelled, tone: "neutral" },
};

/**
 * Porcentaje despachado (0–100) para la barra de progreso.
 * Despachado = todo lo que ya salió de `pending`, incluidos los omitidos: un
 * contacto que se saltó también está resuelto y no volverá a intentarse.
 */
export function campaignProgressPct(stats: CampaignStatsDTO | null): number {
  if (!stats || stats.audience_total <= 0) return 0;
  const dispatched = Math.max(0, stats.audience_total - stats.pending);
  return Math.min(100, Math.round((dispatched / stats.audience_total) * 100));
}

/** Cuántos salieron ya de la cola, para el "940 / 1.200" de la barra. */
export function campaignDispatched(stats: CampaignStatsDTO | null): number {
  if (!stats) return 0;
  return Math.max(0, stats.audience_total - stats.pending);
}

/**
 * Audiencia a mostrar antes de lanzar. Tras el lanzamiento el backend fija
 * `audience_total`; en borrador todavía es 0 y mostrar "0 contactos" sería
 * mentir — la audiencia aún no se ha materializado.
 */
export function campaignAudienceLabel(campaign: CampaignDTO): string | null {
  if (campaign.status === "draft") return null;
  return campaign.audience_total.toLocaleString("es-CO");
}
