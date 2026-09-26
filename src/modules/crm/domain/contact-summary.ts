import type { Schemas } from "@/core/api/types";
import { milestoneEntry, SCORE_MILESTONES, type ContactProfileDTO } from "./contact";
import type { ContactJourneyDTO } from "./journey";

/**
 * Derivaciones puras de Contactos premium (plan `crm_premium_plan.md` §2):
 * el bento de la lista y de la ficha 360. Todo sale de lecturas que ya
 * existen —`/contacts/stats`, el perfil, el recorrido y los pedidos—; aquí no
 * se inventa ninguna cifra.
 */

export type ContactStatsDTO = Schemas["ContactStatsDto"];
export type ContactStatsPeriod = ContactStatsDTO["period"];

/** Frase corta de cada hito para el resumen de «Qué tan cerca está». */
const MILESTONE_SHORT: Record<string, { done: string; pending: string }> = {
  engaged: { done: "habló", pending: "hablar con el negocio" },
  interest: { done: "se interesó", pending: "interés" },
  evaluating: { done: "recibió cotización", pending: "cotización" },
  committed: { done: "se comprometió", pending: "compromiso" },
  converted: { done: "compró", pending: "conversión" },
};

export type ScoreProgress = {
  score: number;
  /** Un tramo por hito del embudo, en orden: alcanzado o no. */
  steps: Array<{ key: string; label: string; reached: boolean }>;
  /** «Habló, se interesó y recibió cotización. Falta: compromiso y conversión.» */
  sentence: string;
};

function joinEs(parts: string[]): string {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * El score como tramos (DESIGN-SYSTEM §9.6: el progreso va en líneas y tramos,
 * nunca en un anillo) y una frase que dice lo recorrido y lo que falta, sin
 * porcentajes negativos (DESIGN §7.1).
 */
export function scoreProgress(profile: ContactProfileDTO): ScoreProgress {
  const steps = SCORE_MILESTONES.map((milestone) => ({
    key: milestone.key,
    label: milestone.label,
    reached: milestoneEntry(profile, milestone.key) !== undefined,
  }));
  const done = steps.filter((step) => step.reached).map((step) => MILESTONE_SHORT[step.key]?.done ?? step.label);
  const pending = steps.filter((step) => !step.reached).map((step) => MILESTONE_SHORT[step.key]?.pending ?? step.label);
  let sentence: string;
  if (done.length === 0) sentence = "Aún no ha hablado con el negocio.";
  else if (pending.length === 0) sentence = "Recorrió todo el embudo: ya compró.";
  else sentence = `${capitalize(joinEs(done))}. Falta: ${joinEs(pending)}.`;
  return { score: Math.max(0, Math.min(100, Math.round(profile.score))), steps, sentence };
}

export type NewContactsSplit = {
  total: number;
  parts: Array<{ key: "prospect" | "lead" | "customer"; label: string; count: number; pct: number }>;
  other: number;
};

/** Cómo llegan los nuevos del período: prospectos, leads y clientes, con su peso. */
export function newContactsSplit(stats: Pick<ContactStatsDTO, "new_count" | "by_stage">): NewContactsSplit {
  const keys = [
    ["prospect", "prospectos"],
    ["lead", "leads"],
    ["customer", "clientes"],
  ] as const;
  const counted = keys.reduce((sum, [key]) => sum + stats.by_stage[key], 0) + stats.by_stage.other;
  const total = Math.max(stats.new_count, counted);
  return {
    total,
    parts: keys.map(([key, label]) => ({
      key,
      label,
      count: stats.by_stage[key],
      pct: total > 0 ? Math.round((stats.by_stage[key] / total) * 100) : 0,
    })),
    other: stats.by_stage.other,
  };
}

/** Lo mínimo de un pedido que la isla necesita (sin importar el módulo de pedidos). */
export type NextUpOrder = {
  id: string;
  order_number: number | null;
  balance_cents: number;
  currency: string;
  payment_state: string;
};

export type ContactNextUp =
  | { kind: "cooling"; title: string; detail: string; dealId: string }
  | { kind: "balance"; title: string; balanceCents: number; currency: string; orderId: string; detail: string }
  | { kind: "cadence"; title: string; detail: string; dealId: string }
  | { kind: "clear"; title: string; detail: string };

/**
 * «Lo próximo» de la ficha, por gravedad: una oportunidad que se enfría →
 * un pedido con saldo → la próxima insistencia de la cadencia → al día.
 * `nextRunLabel` formatea la fecha en la zona del negocio (lo inyecta la UI).
 */
export function contactNextUp(
  journey: ContactJourneyDTO | null,
  orders: readonly NextUpOrder[],
  nextRunLabel: (iso: string) => string,
): ContactNextUp {
  const stage = journey?.stage ?? null;
  const deal = journey?.deal ?? null;
  const cadence = journey?.cadence ?? null;
  const cadenceText =
    cadence !== null && cadence.next_run_at !== null
      ? `Axi le escribe ${nextRunLabel(cadence.next_run_at)} (intento ${cadence.attempts_used + 1} de ${cadence.max_attempts}).`
      : null;

  if (stage !== null && deal !== null && stage.rotting_days !== null && stage.rotting_days > 0 && stage.days_in_stage >= stage.rotting_days) {
    const days = stage.days_in_stage === 1 ? "1 día" : `${stage.days_in_stage} días`;
    return {
      kind: "cooling",
      title: `Se enfría en ${stage.name}`,
      detail: `${days} en la etapa y aguanta ${stage.rotting_days}.${cadenceText ? ` ${cadenceText}` : ""}`,
      dealId: deal.id,
    };
  }

  const owing = orders
    .filter((order) => order.payment_state !== "paid" && order.balance_cents > 0)
    .sort((a, b) => b.balance_cents - a.balance_cents)[0];
  if (owing !== undefined) {
    return {
      kind: "balance",
      title: "Saldo pendiente",
      balanceCents: owing.balance_cents,
      currency: owing.currency,
      orderId: owing.id,
      detail: owing.order_number !== null ? `Del pedido #${String(owing.order_number).padStart(4, "0")}.` : "De un pedido.",
    };
  }

  if (cadenceText !== null && deal !== null && stage !== null) {
    return { kind: "cadence", title: `En ${stage.name}`, detail: cadenceText, dealId: deal.id };
  }

  return { kind: "clear", title: "Todo al día", detail: "Nada se enfría ni queda saldo por cobrar." };
}
