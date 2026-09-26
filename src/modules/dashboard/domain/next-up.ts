/**
 * «Lo próximo»: lo accionable del Panel, en orden de gravedad. Dominio PURO:
 * sale de secciones que el dashboard ya pide (atención, ventas, canales,
 * consumo) y no inventa ninguna cifra. Lo que el rol no puede leer llega como
 * `null` y simplemente no aporta filas (RBAC natural, DESIGN-SYSTEM §9.5).
 */
import type { InboxCountsDTO, OrderStatsDTO, UsageSummaryDTO } from "@/modules/dashboard/domain/dashboard";
import type { ChannelHealth } from "@/modules/dashboard/domain/health";
import { formatInteger } from "@/core/lib/commercial-units";

export type NextUpTone = "destructive" | "warning" | "neutral";

export interface NextUpAction {
  label: string;
  href: string;
}

export interface NextUpItem {
  key: string;
  tone: NextUpTone;
  /** Cifra al frente de la fila («4 esperan en cola»); sin ella la fila lleva icono. */
  count: number | null;
  title: string;
  detail: string;
  href: string;
  /** El botón que la resuelve, si es la fila más grave de su tipo. */
  action: NextUpAction;
  icon: "channel" | "paused" | null;
}

export const NEXT_UP_ROUTES = {
  inbox: "/workspace/inbox",
  orders: "/orders",
  channels: "/settings/channels",
  billing: "/billing",
} as const;

export interface NextUpInput {
  attention: InboxCountsDTO | null;
  sales: OrderStatsDTO | null;
  channels: ChannelHealth[] | null;
  usage: UsageSummaryDTO | null;
  /** Nombre visible de un `kind` de canal («Instagram»). */
  kindLabel: (kind: string) => string;
}

const inbox: NextUpAction = { label: "Ir al inbox", href: NEXT_UP_ROUTES.inbox };

/** Una fila por cosa que espera a alguien, la más grave primero. */
export function nextUpItems({ attention, sales, channels, usage, kindLabel }: NextUpInput): NextUpItem[] {
  const items: NextUpItem[] = [];
  const aiPaused = usage?.ai_paused === true;

  for (const channel of channels ?? []) {
    if (channel.level !== "critical") continue;
    const kind = kindLabel(channel.kind);
    items.push({
      key: `channel-${channel.id}`,
      tone: "destructive",
      count: null,
      title: `${kind} se desconectó`,
      detail: `los mensajes de ${channel.name} no entran`,
      href: NEXT_UP_ROUTES.channels,
      action: { label: `Reconectar ${kind}`, href: NEXT_UP_ROUTES.channels },
      icon: "channel",
    });
  }

  if (aiPaused) {
    items.push({
      key: "ai-paused",
      tone: "warning",
      count: null,
      title: "La IA está en pausa",
      detail: "llegó al límite del plan",
      href: NEXT_UP_ROUTES.billing,
      action: { label: "Ver el plan", href: NEXT_UP_ROUTES.billing },
      icon: "paused",
    });
  }

  if (attention && attention.queued > 0) {
    items.push({
      key: "queued",
      tone: "warning",
      count: attention.queued,
      title: attention.queued === 1 ? "espera en cola" : "esperan en cola",
      detail: aiPaused ? "sin IA, las contesta tu equipo" : "nadie las ha tomado todavía",
      href: NEXT_UP_ROUTES.inbox,
      action: inbox,
      icon: null,
    });
  }

  if (attention && attention.mine > 0) {
    items.push({
      key: "mine",
      tone: "neutral",
      count: attention.mine,
      title: attention.mine === 1 ? "asignada a ti" : "asignadas a ti",
      detail: attention.unread_total > 0 ? `${formatInteger(attention.unread_total)} sin leer en todo el inbox` : "todo leído",
      href: NEXT_UP_ROUTES.inbox,
      action: inbox,
      icon: null,
    });
  }

  const pending = sales?.kpis.pending_verification ?? 0;
  if (pending > 0) {
    items.push({
      key: "payments",
      tone: "warning",
      count: pending,
      title: pending === 1 ? "pago por verificar" : "pagos por verificar",
      detail: "mira el comprobante y confirma",
      href: NEXT_UP_ROUTES.orders,
      action: { label: "Ver pagos", href: NEXT_UP_ROUTES.orders },
      icon: null,
    });
  }

  return items;
}

/** Las dos acciones de la isla: la de la fila más grave y la siguiente distinta. */
export function nextUpActions(items: NextUpItem[]): NextUpAction[] {
  const actions: NextUpAction[] = [];
  for (const item of items) {
    if (actions.some((action) => action.href === item.action.href)) continue;
    actions.push(item.action);
    if (actions.length === 2) break;
  }
  return actions;
}

/** El titular: urgente si algo está caído, sereno si solo hay trabajo. */
export function nextUpHeadline(items: NextUpItem[]): string {
  return items.some((item) => item.tone === "destructive") ? "No puede esperar" : "Esto te espera ahora";
}

/** «La IA atiende 16 de las 23 abiertas» — solo si atiende algo y no está en pausa. */
export function aiStatusLine(attention: InboxCountsDTO | null, usage: UsageSummaryDTO | null): string | null {
  if (!attention || usage?.ai_paused === true || attention.ai <= 0 || attention.all_open <= 0) return null;
  if (attention.all_open === 1) return "La IA atiende la única abierta";
  if (attention.ai === attention.all_open) return `La IA atiende las ${formatInteger(attention.all_open)} abiertas`;
  return `La IA atiende ${formatInteger(attention.ai)} de las ${formatInteger(attention.all_open)} abiertas`;
}

/** Las fuentes que deciden la isla, dichas en una frase («No pudimos leer la cola del inbox»). */
export const NEXT_UP_SOURCES = {
  attention: "la cola del inbox",
  sales: "los pagos por verificar",
  channels: "el estado de los canales",
  usage: "el estado de la IA",
} as const;

export type NextUpSource = keyof typeof NEXT_UP_SOURCES;

/**
 * «la cola del inbox y el estado de la IA». Una fuente que no se pudo leer NO
 * es una fuente sin pendientes: la isla lo dice en vez de afirmar «Todo al
 * día» (auditoría, P1-1).
 */
export function unreadSourcesPhrase(failed: readonly NextUpSource[]): string {
  const labels = failed.map((source) => NEXT_UP_SOURCES[source]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}
