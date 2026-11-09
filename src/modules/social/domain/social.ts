import type { Schemas } from "@/core/api/types";

/**
 * «Comenta y recibe» (Marketing › Redes). Tipos del contrato y el vocabulario
 * con el que la pantalla le habla al dueño. Puro: sin React ni http.
 */
export type SocialAutomationDTO = Schemas["SocialAutomationDto"];
export type CreateSocialAutomationDTO = Schemas["CreateSocialAutomationDto"];
export type UpdateSocialAutomationDTO = Schemas["UpdateSocialAutomationDto"];
export type ActivityItemDTO = Schemas["ActivityListDto"]["data"][number];
export type SocialChannelDTO = Schemas["SocialChannelsListDto"]["data"][number];
export type SocialMediaDTO = Schemas["SocialMediaListDto"]["data"][number];
export type DeliveryBlock = SocialAutomationDTO["delivery"][number];
export type SocialAssetDTO = Schemas["SocialAssetDto"];
export type ReadinessGap = SocialAutomationDTO["gaps"][number];
export type Funnel = SocialAutomationDTO["funnel"];

export const STATUS_LABELS: Record<SocialAutomationDTO["status"], string> = {
  draft: "Borrador",
  active: "Activa",
  paused: "Pausada",
};

/** Qué falta para activar, en el orden del editor y con el paso que lo resuelve. */
export const GAP_LABELS: Record<ReadinessGap, { label: string; step: EditorStep }> = {
  channels: { label: "elegir la cuenta de Instagram o Facebook", step: "where" },
  media: { label: "elegir al menos una publicación", step: "where" },
  keywords: { label: "escribir la palabra que la gente comenta", step: "words" },
  public_reply: { label: "escribir la respuesta pública", step: "public" },
  opener: { label: "escribir el mensaje privado", step: "opener" },
  delivery: { label: "agregar lo que vas a entregar", step: "delivery" },
};

export type EditorStep = "where" | "words" | "public" | "opener" | "delivery" | "after";

/** Por qué un comentario no recibió nada, como lo entendería el dueño. */
export const IGNORE_LABELS: Record<string, string> = {
  no_automation: "La publicación no tiene automatización",
  no_match: "No escribió la palabra",
  thread_reply: "Era una respuesta dentro de otro comentario",
  test_mode: "Modo prueba: no es una cuenta de tu equipo",
  opted_out: "Pidió no recibir mensajes",
  already_delivered: "Ya lo había recibido",
  already_contacted: "Ya le habíamos escrito y no tocó",
  too_old: "El comentario tenía más de 7 días",
  comment_removed: "Borró o se ocultó el comentario",
  live: "Fue en un en vivo",
  paused: "La automatización estaba pausada",
  policy_blocked: "No se le puede escribir por ese canal",
};

export const FAIL_LABELS: Record<string, string> = {
  comment_not_found: "Meta ya no encuentra el comentario",
  already_replied: "Meta no deja escribirle de nuevo por ese comentario",
  window_closed: "Pasó el tiempo que Meta deja para escribir",
  attachment_rejected: "Meta no aceptó un archivo de la entrega",
  permission_missing: "Falta un permiso: reconecta la cuenta",
  credentials_invalid: "La conexión venció: reconecta la cuenta",
  rate_limited: "Meta pidió esperar",
  unknown_maybe_delivered: "Puede que le haya llegado: Meta no confirmó",
  opted_out: "Pidió no recibir mensajes",
  empty_delivery: "La entrega estaba vacía",
  blocked: "Tu negocio no podía enviar mensajes en ese momento",
  unknown: "Meta no lo aceptó",
};

export type ActivityTone = "success" | "info" | "warning" | "destructive" | "neutral";

/** Cómo va cada comentario, en una frase y un tono. */
export function describeActivity(item: ActivityItemDTO): { label: string; tone: ActivityTone } {
  switch (item.status) {
    case "delivered":
      return { label: "Recibió la entrega", tone: "success" };
    case "opened":
      return { label: "Tocó «Envíamelo»", tone: "info" };
    case "private_replied":
      return { label: "Le escribimos por privado", tone: "info" };
    case "pending":
      return { label: "En cola", tone: "neutral" };
    case "failed":
      return { label: FAIL_LABELS[item.fail_reason ?? "unknown"] ?? FAIL_LABELS.unknown, tone: "destructive" };
    case "ignored":
      return { label: IGNORE_LABELS[item.ignore_reason ?? ""] ?? "No aplicaba", tone: "neutral" };
  }
}

export interface FunnelStage {
  key: "comments" | "contacted" | "opened" | "delivered";
  label: string;
  value: number;
  /** Porcentaje sobre la etapa anterior; null en la primera o sin base. */
  rate: number | null;
}

/**
 * El embudo con la voz del progreso: de cada etapa a la siguiente, cuánto pasa.
 * El porcentaje es sobre la etapa ANTERIOR, que es la pregunta que el dueño se
 * hace («de los que les escribimos, ¿cuántos tocaron?»).
 */
export function funnelStages(funnel: Funnel): FunnelStage[] {
  const raw = [
    { key: "comments", label: "Comentarios", value: funnel.comments },
    { key: "contacted", label: "Les escribimos", value: funnel.contacted },
    { key: "opened", label: "Tocaron «Envíamelo»", value: funnel.opened },
    { key: "delivered", label: "Recibieron la entrega", value: funnel.delivered },
  ] as const;
  return raw.map((stage, index) => {
    const base = index === 0 ? null : raw[index - 1].value;
    return {
      ...stage,
      rate: base === null || base === 0 ? null : Math.round((stage.value / base) * 100),
    };
  });
}

/** Suma de embudos para el resumen de la sección. */
export function sumFunnels(rows: readonly SocialAutomationDTO[]): Funnel {
  return rows.reduce<Funnel>(
    (acc, row) => ({
      comments: acc.comments + row.funnel.comments,
      contacted: acc.contacted + row.funnel.contacted,
      opened: acc.opened + row.funnel.opened,
      delivered: acc.delivered + row.funnel.delivered,
      ignored: acc.ignored + row.funnel.ignored,
      failed: acc.failed + row.funnel.failed,
    }),
    { comments: 0, contacted: 0, opened: 0, delivered: 0, ignored: 0, failed: 0 },
  );
}

/** «Te falta: …» en una frase. */
export function describeGaps(gaps: readonly ReadinessGap[]): string | null {
  if (gaps.length === 0) return null;
  const parts = gaps.map((gap) => GAP_LABELS[gap].label);
  const last = parts.pop();
  return parts.length === 0 ? `Te falta ${last}.` : `Te falta ${parts.join(", ")} y ${last}.`;
}

/** La respuesta pública tal como se verá: `{nombre}` → @usuario. */
export function previewPublicReply(template: string, username: string): string {
  return template.replaceAll("{nombre}", `@${username}`).replace(/\s{2,}/g, " ").trim();
}

export const DEFAULT_BUTTON_TITLE = "Envíamelo";
