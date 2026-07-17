/**
 * Traducciones es-CO del dominio analytics (copy exacto del plan F13 §4.6).
 * El usuario es el owner del negocio (no técnico): códigos wire → frases
 * naturales. TypeScript puro (sin React, sin http, sin zod).
 */

/** Banda de score con semáforo fijo: ≥80 bien · 50–79 mejorable · <50 crítico. */
export type ScoreBand = "good" | "warning" | "critical";

export function scoreBand(score: number): ScoreBand {
  if (score >= 80) return "good";
  if (score >= 50) return "warning";
  return "critical";
}

export const SCORE_BAND_LABELS: Record<ScoreBand, string> = {
  good: "Buenas",
  warning: "Mejorables",
  critical: "Críticas",
};

export const ISSUE_LABELS: Record<string, string> = {
  wrong_product_listed: "Producto equivocado",
  invented_data: "Datos inventados",
  missed_close: "Cierre no intentado",
  ignored_stock: "Ignoró el inventario",
  broken_promise: "Promesa incumplida",
  wrong_tool_choice: "Usó la herramienta equivocada",
  unnecessary_escalation: "Escalada innecesaria",
  ignored_customer_request: "Ignoró lo que pidió el cliente",
  tone_issue: "Problema de tono",
  other: "Otro",
};

export function issueLabel(code: string): string {
  return ISSUE_LABELS[code] ?? code;
}

export const OUTCOME_LABELS: Record<string, string> = {
  closed_won: "Venta ganada",
  closed_lost_recoverable: "Venta perdida (recuperable)",
  closed_lost_unavoidable: "Venta perdida (inevitable)",
  abandoned_by_customer: "Cliente no respondió",
  handled_by_human: "Atendida por tu equipo",
  info_only: "Solo consulta",
};

export function outcomeLabel(code: string | null): string {
  if (!code) return "—";
  return OUTCOME_LABELS[code] ?? code;
}

export const FUNNEL_STAGE_LABELS: Record<string, string> = {
  conversation: "Conversación",
  intent_detected: "Con intención",
  quoted: "Cotizada",
  order_pending: "Pedido creado",
  order_confirmed: "Pedido confirmado",
  order_paid: "Pedido pagado",
  appointment_scheduled: "Cita agendada",
  appointment_completed: "Cita completada",
};

export function funnelStageLabel(code: string): string {
  return FUNNEL_STAGE_LABELS[code] ?? code;
}

export const SUBSCORE_LABELS: Record<string, string> = {
  accuracy: "Precisión",
  tool_usage: "Uso de datos",
  closing: "Cierre de venta",
  tone: "Tono",
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: "Leve",
  medium: "Media",
  high: "Alta",
};

export const HALLUCINATION_LABELS: Record<string, string> = {
  minor: "Alucinación leve",
  major: "Alucinación grave",
};

export const ALERT_RULE_LABELS: Record<string, string> = {
  ai_failures_spike: "Pico de fallos de la IA",
  escalation_rate: "Demasiadas escaladas a humano",
  latency_p95: "El agente responde lento",
  low_score_streak: "Racha de evaluaciones bajas",
  hallucination_detected: "Alucinación detectada",
};

export function alertRuleLabel(rule: string): string {
  return ALERT_RULE_LABELS[rule] ?? rule;
}

export const ALERT_STATUS_LABELS: Record<string, string> = {
  triggered: "Activas",
  acknowledged: "Atendidas",
  resolved: "Resueltas",
};

const formatNumber = (value: number): string =>
  value.toLocaleString("es-CO", { maximumFractionDigits: 1 });

const formatSeconds = (ms: number): string => `${formatNumber(ms / 1000)} s`;

/**
 * Frase natural de una alerta (valor vs umbral) — nunca el payload crudo.
 * Ventanas según las reglas del backend: fallos 15 min, escaladas/latencia 1 h.
 */
export function alertDescription(
  rule: string,
  valueAtTrigger: number,
  threshold: number,
): string {
  switch (rule) {
    case "ai_failures_spike":
      return `${formatNumber(valueAtTrigger)} fallos en los últimos 15 minutos (umbral: ${formatNumber(threshold)}).`;
    case "escalation_rate":
      return `El ${formatNumber(valueAtTrigger)} % de las respuestas pasó a tu equipo por fallo de la IA en la última hora (umbral: ${formatNumber(threshold)} %).`;
    case "latency_p95":
      return `El agente tardó hasta ${formatSeconds(valueAtTrigger)} en responder durante la última hora (umbral: ${formatSeconds(threshold)}).`;
    case "low_score_streak":
      return `${formatNumber(valueAtTrigger)} evaluaciones seguidas con puntaje menor a ${formatNumber(threshold)}.`;
    case "hallucination_detected":
      return "Inventó información en una conversación con un cliente.";
    default:
      return `Valor ${formatNumber(valueAtTrigger)} (umbral: ${formatNumber(threshold)}).`;
  }
}
