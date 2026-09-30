import type { Schemas } from "@/core/api/types";

/**
 * Motor de decisiones (P1b) en la consola de plataforma. Módulo PURO: tipos
 * del contrato, nombres de los propósitos y utilidades de la vista.
 * Mockup aprobado: docs/design/mockups/decisiones-ia/index.html (monorepo).
 */

export type DecisionRoutesView = Schemas["DecisionRoutesViewDto"];
export type DecisionRouteRow = DecisionRoutesView["routes"][number];
export type DecisionTargetOption = DecisionRoutesView["options"][number];
export type DecisionPurpose = DecisionRouteRow["purpose"];
export type DecisionMode = DecisionRouteRow["mode"];
export type UpdateDecisionRouteDTO = Schemas["UpdateDecisionRouteDto"];
export type DecisionHealthRow = Schemas["DecisionHealthDto"]["data"][number];

export interface DecisionTarget {
  provider: string;
  model: string;
}

/** Qué decide cada propósito, en palabras de quien opera la consola. */
export const PURPOSE_META: Record<DecisionPurpose, { label: string; description: string }> = {
  intent: { label: "Intención del cliente", description: "Clasifica qué quiere el cliente en la conversación" },
  reply_reaction: {
    label: "Reacción a la respuesta",
    description: "Interesado, ahora no, no es la persona, baja…",
  },
  lead_fit: { label: "Encaje de la cuenta", description: "Qué tanto se parece al cliente ideal" },
  lead_intent: { label: "Necesidad de la cuenta", description: "Qué necesidad muestran sus señales de hecho" },
  message_fit: {
    label: "Encaje del mensaje",
    description: "Si el mensaje encaja con ese lead antes de enviarlo",
  },
  handoff_urgency: { label: "Urgencia de traspaso", description: "Cuándo pasar la conversación a una persona" },
  // Llamadas F6: Jev clasifica en sombra cada frase del cliente al teléfono.
  voice_utterance: {
    label: "Frase en la llamada",
    description: "Qué dijo el cliente al teléfono: pregunta, objeción, acepta, rechaza o buzón",
  },
  custom: { label: "Uso libre", description: "Cualquier otra decisión de un módulo" },
};

export const MODE_OPTIONS: readonly { value: DecisionMode; label: string }[] = [
  { value: "off", label: "Apagado" },
  { value: "shadow", label: "Sombra" },
  { value: "primary", label: "Decide" },
];

/** Clave estable de un par para los `<select>` y las filas. */
export function targetKey(target: DecisionTarget): string {
  return `${target.provider}|${target.model}`;
}

export function parseTargetKey(key: string): DecisionTarget | null {
  const [provider, model] = key.split("|");
  return provider && model ? { provider, model } : null;
}

/** Los pares elegibles agrupados por proveedor (el `<optgroup>` del selector). */
export function groupOptions(options: readonly DecisionTargetOption[]): { provider: string; options: DecisionTargetOption[] }[] {
  const groups = new Map<string, DecisionTargetOption[]>();
  for (const option of options) {
    groups.set(option.provider, [...(groups.get(option.provider) ?? []), option]);
  }
  return [...groups.entries()].map(([provider, list]) => ({ provider, options: list }));
}

/** Nombre legible de un par para la tabla de salud (catálogo o, si no está, la clave). */
export function targetName(target: DecisionTarget, options: readonly DecisionTargetOption[]): string {
  return (
    options.find((option) => option.provider === target.provider && option.model === target.model)?.display_name ??
    target.model
  );
}

/** ¿La fila difiere de lo guardado? */
export function routeChanged(saved: DecisionRouteRow, draft: UpdateDecisionRouteDTO): boolean {
  return (
    saved.mode !== draft.mode ||
    targetKey(saved.primary) !== targetKey(draft.primary) ||
    (saved.fallback === null ? "" : targetKey(saved.fallback)) !==
      (draft.fallback === null ? "" : targetKey(draft.fallback))
  );
}

export function errorRate(row: DecisionHealthRow): number {
  return row.decisions === 0 ? 0 : row.errors / row.decisions;
}

/** Una decisión cuesta fracciones de centavo: por debajo de uno se muestran dos cifras significativas. */
export function formatUsd(value: number): string {
  const digits =
    value > 0 && value < 0.01
      ? { maximumSignificantDigits: 2 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return `$ ${value.toLocaleString("es-CO", digits)} USD`;
}

export function formatMs(value: number | null): string {
  return value === null ? "—" : `${value.toLocaleString("es-CO")} ms`;
}

// ── Comparación de proveedores en quality (P1b, regla d) ─────────────────────

export interface DecisionComparisonRow {
  /** `proveedor:modelo` tal como lo escribe el servidor. */
  key: string;
  provider: string;
  model: string;
  items: number;
  hits: number;
  accuracy: number;
  errors: number;
  p50_ms: number;
  p95_ms: number;
  cost_usd: number;
}

/**
 * Lee `metrics.by_target` de una corrida probe de intención. `[]` = la
 * corrida no comparó proveedores. Tolerante: una fila mal formada se omite.
 */
export function parseDecisionComparison(metrics: unknown): DecisionComparisonRow[] {
  if (metrics === null || typeof metrics !== "object") return [];
  const byTarget = (metrics as { by_target?: unknown }).by_target;
  if (byTarget === null || typeof byTarget !== "object") return [];
  const num = (value: unknown): number => (typeof value === "number" && Number.isFinite(value) ? value : 0);
  return Object.entries(byTarget as Record<string, unknown>).flatMap(([key, raw]) => {
    if (raw === null || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const cut = key.indexOf(":");
    return [
      {
        key,
        provider: cut === -1 ? key : key.slice(0, cut),
        model: cut === -1 ? "" : key.slice(cut + 1),
        items: num(row.items),
        hits: num(row.hits),
        accuracy: num(row.accuracy),
        errors: num(row.errors),
        p50_ms: num(row.p50_ms),
        p95_ms: num(row.p95_ms),
        cost_usd: num(row.cost_usd),
      },
    ];
  });
}
