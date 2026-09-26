import { canEnableAutomation, type AutomationDTO } from "./automation";
import { isPromotionLive, redemptionProgressPct, type PromotionDTO } from "./promotion";
import type { MessagingWindowDTO } from "./template-catalog";

/**
 * «Lo próximo» del Resumen de Marketing: lo que está a medio camino, en orden
 * de gravedad. Puro para poder probarlo sin montar la vista: decide QUÉ se
 * pide y en qué orden; la vista solo lo pinta.
 */

/** Lo que el Resumen sabe de WhatsApp Cloud. `null` = el tenant no tiene número Cloud. */
export type MetaStatus = {
  approved: number;
  pending: number;
  rejected: number;
  /** El nombre de la primera rechazada, para decir cuál sin abrir otra pantalla. */
  rejectedName: string | null;
  window: MessagingWindowDTO | null;
};

export type NextUpTone = "destructive" | "warning" | "neutral";

export type MarketingNextUpItem = {
  key: "rejected-template" | "blocked-rules" | "promotions-ending" | "quota-low" | "drafts";
  /** La cifra de la fila; `null` cuando la fila no se cuenta (el cupo). */
  count: number | null;
  title: string;
  detail: string;
  tone: NextUpTone;
  href: string;
  /** El botón que resuelve la fila, si la isla la pone arriba. */
  action: string;
};

/** Lo que se considera «por vencer»: 48 h. Un cupón que vence en una semana todavía no pide nada. */
export const ENDING_SOON_MS = 48 * 60 * 60 * 1000;
/** «Por agotarse»: 90 % del tope de canjes. */
export const EXHAUSTING_PCT = 90;
/** Cupo de Meta «casi gastado»: queda menos del 10 %. */
export const QUOTA_LOW_RATIO = 0.1;

const TONE_ORDER: Record<NextUpTone, number> = { destructive: 0, warning: 1, neutral: 2 };

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Promociones vivas que vencen en 48 h o están a un 90 % de su tope. */
export function endingPromotions(promotions: PromotionDTO[], now: Date): PromotionDTO[] {
  return promotions.filter((promotion) => {
    if (!isPromotionLive(promotion, now)) return false;
    const endsSoon =
      promotion.ends_at !== null && new Date(promotion.ends_at).getTime() - now.getTime() <= ENDING_SOON_MS;
    const pct = redemptionProgressPct(promotion);
    return endsSoon || (pct !== null && pct >= EXHAUSTING_PCT);
  });
}

function whyEnding(promotion: PromotionDTO, now: Date): string {
  if (promotion.ends_at !== null) {
    const hours = (new Date(promotion.ends_at).getTime() - now.getTime()) / 3_600_000;
    if (hours <= ENDING_SOON_MS / 3_600_000) return hours <= 24 ? "vence hoy o mañana" : "vence en dos días";
  }
  return `va en el ${String(redemptionProgressPct(promotion) ?? 0)} % de sus canjes`;
}

export function marketingNextUpItems(input: {
  automations: AutomationDTO[] | null;
  promotions: PromotionDTO[] | null;
  drafts: number | null;
  meta: MetaStatus | null | undefined;
  now: Date;
}): MarketingNextUpItem[] {
  const items: MarketingNextUpItem[] = [];

  if (input.meta && input.meta.rejected > 0) {
    const n = input.meta.rejected;
    items.push({
      key: "rejected-template",
      count: n,
      title: `${plural(n, "plantilla rechazada", "plantillas rechazadas")} por Meta`,
      detail: input.meta.rejectedName ? `«${input.meta.rejectedName}» · revísala y reenvíala` : "revísalas y reenvíalas",
      tone: "destructive",
      href: "/marketing/settings/meta-templates",
      action: "Revisar plantilla",
    });
  }

  // Una regla que escribe fuera de las 24 h sin plantilla de Meta no puede encenderse: es trabajo a medias.
  const blocked = (input.automations ?? []).filter((automation) => !canEnableAutomation(automation));
  if (blocked.length > 0) {
    const n = blocked.length;
    items.push({
      key: "blocked-rules",
      count: n,
      title: plural(n, "regla no puede enviar", "reglas no pueden enviar"),
      detail: `«${blocked[0].name}» necesita una plantilla de Meta`,
      tone: "warning",
      href: `/marketing/automations?automation=${encodeURIComponent(blocked[0].id)}`,
      action: "Poner plantilla",
    });
  }

  const ending = input.promotions ? endingPromotions(input.promotions, input.now) : [];
  if (ending.length > 0) {
    const n = ending.length;
    items.push({
      key: "promotions-ending",
      count: n,
      title: plural(n, "promoción por vencer o agotarse", "promociones por vencer o agotarse"),
      detail: `«${ending[0].name}» ${whyEnding(ending[0], input.now)}`,
      tone: "warning",
      href: "/marketing/promotions",
      action: "Ver promociones",
    });
  }

  const window = input.meta?.window;
  if (window && window.limit !== null && window.limit > 0) {
    const remaining = window.remaining ?? window.limit;
    if (remaining / window.limit < QUOTA_LOW_RATIO) {
      items.push({
        key: "quota-low",
        count: null,
        title: "Cupo de Meta casi gastado",
        detail: `quedan ${remaining.toLocaleString("es-CO")} de ${window.limit.toLocaleString("es-CO")} conversaciones hoy`,
        tone: "warning",
        href: "/marketing/campaigns",
        action: "Ver campañas",
      });
    }
  }

  if (input.drafts !== null && input.drafts > 0) {
    const n = input.drafts;
    items.push({
      key: "drafts",
      count: n,
      title: plural(n, "borrador sin lanzar", "borradores sin lanzar"),
      detail: "se retoman donde se quedaron",
      tone: "neutral",
      href: "/marketing/campaigns",
      action: "Ver borradores",
    });
  }

  return items.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/** El titular de la isla: una fila se nombra; varias, se agrupan. */
export function marketingNextUpHeadline(items: MarketingNextUpItem[]): string {
  if (items.some((item) => item.tone === "destructive")) return "Algo necesita tu revisión";
  return items.length === 1 ? "Una cosa a medio camino" : "Esto está a medio camino";
}
