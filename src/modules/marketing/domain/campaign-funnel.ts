import type { StatusMap } from "@/shared/components/features/status-badge/types";
import type { CampaignStatsDTO, CampaignRecipientDTO } from "./campaign";
import { RECIPIENT_STATUS_LABELS, type RecipientStatus } from "./enums";

/**
 * Lectura del embudo de una campaña. TypeScript puro: la vista solo dibuja.
 *
 * El backend NO manda un embudo; manda contadores por estado de destinatario.
 * Componerlo aquí (y no en el JSX) es lo que permite testear que las etapas son
 * acumulativas de verdad: `read ⊆ delivered ⊆ despachados`. Si se sumaran mal,
 * el embudo crecería hacia abajo y nadie lo notaría mirando barras bonitas.
 */

export type FunnelStage = {
  key: string;
  label: string;
  value: number;
  /** Qué significa exactamente la cifra, para el tooltip / pie de etapa. */
  hint: string;
};

/**
 * Cinco etapas, cada una subconjunto de la anterior.
 *
 * Los contadores del backend son un `groupBy(status)`: `sent`, `delivered` y
 * `read` son EXCLUYENTES entre sí (verificado en `campaign_stats.query.ts`, no
 * deducido del nombre). Para que el embudo sea acumulativo hay que SUMARLOS:
 * quien leyó el mensaje también lo recibió, y quien lo recibió también salió.
 * Leerlos tal cual dibujaría un embudo que crece hacia abajo.
 *
 * `queued` queda fuera de "Despachados" a propósito. El backend sí lo mete en
 * el denominador de sus `*_rate`, pero un mensaje en cola todavía no salió, y
 * contarlo como despachado inflaría la etapa con lo que aún puede fallar.
 */
export function campaignFunnel(stats: CampaignStatsDTO): FunnelStage[] {
  const delivered = stats.delivered + stats.read;
  const dispatched = stats.sent + delivered + stats.failed;

  return [
    {
      key: "audience",
      label: "Audiencia",
      value: stats.audience_total,
      hint: "Contactos congelados al lanzar la campaña.",
    },
    {
      key: "dispatched",
      label: "Despachados",
      value: dispatched,
      hint: "Salieron hacia el canal. No incluye a los omitidos.",
    },
    {
      key: "delivered",
      label: "Entregados",
      value: delivered,
      hint: "Confirmados por el canal. Se reconcilian por lotes cada ~5 min.",
    },
    {
      key: "replies",
      label: "Respondieron",
      value: stats.replies,
      hint: "Escribieron de vuelta dentro de la ventana de atribución.",
    },
    {
      key: "conversions",
      label: "Compraron",
      value: stats.conversions,
      hint: "Se cuenta cuando el pedido se paga de verdad, no al crearlo.",
    },
  ];
}

/**
 * Caída entre dos etapas consecutivas, en porcentaje entero, o `null` si la
 * etapa de origen está vacía (dividir por cero produciría un 0 % que se lee
 * como "se cayó todo", que es justo lo contrario de "no hay datos aún").
 */
export function stagePct(from: number, to: number): number | null {
  if (from <= 0) return null;
  return Math.round((to / from) * 100);
}

/**
 * Cuántos no recibieron nada. Se calcula aparte del embudo a propósito: los
 * omitidos NO son una etapa, son una fuga lateral que ocurre antes del despacho.
 */
export function campaignSkipped(stats: CampaignStatsDTO): number {
  return stats.skipped;
}

/** Cuántos quedan por resolver. `> 0` significa que las cifras aún se mueven. */
export function campaignPending(stats: CampaignStatsDTO): number {
  return stats.pending + stats.queued;
}

/** Semáforo por estado de destinatario. Solo `queued` es transitorio. */
export const RECIPIENT_STATUS_MAP: StatusMap = {
  pending: { label: RECIPIENT_STATUS_LABELS.pending, tone: "neutral" },
  queued: { label: RECIPIENT_STATUS_LABELS.queued, tone: "info", transient: true },
  sent: { label: RECIPIENT_STATUS_LABELS.sent, tone: "info" },
  delivered: { label: RECIPIENT_STATUS_LABELS.delivered, tone: "success" },
  read: { label: RECIPIENT_STATUS_LABELS.read, tone: "success" },
  // Rojo, nunca coral: un fallo es destructivo, no una acción (DESIGN §3.1).
  failed: { label: RECIPIENT_STATUS_LABELS.failed, tone: "destructive" },
  skipped: { label: RECIPIENT_STATUS_LABELS.skipped, tone: "warning" },
};

export const RECIPIENT_STATUS_ORDER: readonly RecipientStatus[] = [
  "read",
  "delivered",
  "sent",
  "queued",
  "pending",
  "skipped",
  "failed",
] as const;

/**
 * El momento más avanzado que alcanzó este destinatario. Se elige de atrás
 * hacia delante porque es lo que el operador quiere ver: si respondió, da igual
 * cuándo se entregó.
 */
export function recipientMilestone(
  recipient: CampaignRecipientDTO,
): { at: string; label: string } | null {
  if (recipient.replied_at) return { at: recipient.replied_at, label: "Respondió" };
  if (recipient.read_at) return { at: recipient.read_at, label: "Leyó" };
  if (recipient.delivered_at) return { at: recipient.delivered_at, label: "Recibió" };
  if (recipient.sent_at) return { at: recipient.sent_at, label: "Salió" };
  if (recipient.queued_at) return { at: recipient.queued_at, label: "Encolado" };
  return null;
}

/** Nombre presentable de un destinatario; el teléfono es el último recurso. */
export function recipientName(recipient: CampaignRecipientDTO): string {
  return recipient.contact.full_name?.trim() || recipient.contact.phone || "Contacto sin nombre";
}
