import type { Schemas } from "@/core/api/types";

/**
 * Marcos por etapas de las llamadas proactivas (plan de modos §5). TS puro:
 * tipos del contrato, etiquetas y las reglas del editor. Las reglas son las
 * MISMAS que valida el servidor (`playbookIssues`, límites de
 * `PLAYBOOK_LIMITS`): aquí solo sirven para avisar al instante; el servidor
 * manda y responde 422 con `details.issues` si algo se escapa.
 */

export type PlaybookView = Schemas["CallPlaybookViewDto"];
export type Playbook = PlaybookView["playbook"];
export type PlaybookStage = Playbook["stages"][number];
export type ProactiveCallType = PlaybookView["call_type"];
export type CallsFunnelDTO = Schemas["CallsFunnelDto"];
export type FunnelType = CallsFunnelDTO["types"][number];
export type PreviewOpeningDTO = Schemas["PreviewOpeningResultDto"];
export type ProposeResultDTO = Schemas["ProposeCallPlaybooksResultDto"];

export const PLAYBOOK_LIMITS = {
  min_stages: 2,
  max_stages: 10,
  label: 60,
  text: 240,
  list_items: 6,
  list_item: 120,
  opening: 400,
} as const;

/** Orden fijo de la pantalla: el mismo del servidor (`PROACTIVE_CALL_TYPES`). */
export const PROACTIVE_CALL_TYPES: readonly ProactiveCallType[] = [
  "appointment_reminder",
  "sales_followup",
  "collections",
  "reactivation",
  "followup",
];

/**
 * Los marcos que se eligen desde el CRM (tareas, lotes, secuencias): espejo de
 * `CRM_CALL_TYPES` del servidor. Cobranza (necesita un plan de Cobros) y
 * Recordatorio (una cita) tienen su propio origen: Cobros y la agenda.
 */
export const CRM_CALL_TYPES = ["sales_followup", "reactivation", "followup"] as const satisfies readonly ProactiveCallType[];
export type CrmCallType = (typeof CRM_CALL_TYPES)[number];

export const CALL_TYPE_LABELS: Record<ProactiveCallType | "inbound_attention", string> = {
  appointment_reminder: "Recordatorio de cita",
  sales_followup: "Venta y seguimiento comercial",
  collections: "Cobranza",
  reactivation: "Reactivación y postventa",
  followup: "Seguimiento",
  inbound_attention: "Atención entrante",
};

/** Qué hace cada tipo, en una línea: el subtítulo de su ficha. */
export const CALL_TYPE_HINTS: Record<ProactiveCallType, string> = {
  appointment_reminder: "Confirmar, reprogramar o cancelar la cita.",
  sales_followup: "Calificar, proponer y cerrar o agendar.",
  collections: "Saldo, compromiso de pago y link por WhatsApp.",
  reactivation: "Volver a hablar con quien ya compró.",
  followup: "Retomar un tema pendiente.",
};

export function callTypeLabel(type: string | null | undefined): string {
  if (type === null || type === undefined) return "Sin tipo";
  return (CALL_TYPE_LABELS as Record<string, string>)[type] ?? type;
}

/** El estado de la ficha de un tipo, en palabras. */
export type PlaybookState = "base" | "customized" | "proposal" | "off";

export function playbookState(view: PlaybookView): PlaybookState {
  if (!view.enabled) return "off";
  if (view.proposal !== null) return "proposal";
  return view.customized ? "customized" : "base";
}

export const PLAYBOOK_STATE_LABELS: Record<PlaybookState, string> = {
  base: "Base de axi",
  customized: "Ajustado por ti",
  proposal: "Alba propone",
  off: "Apagado",
};

/** Clave nueva para una etapa propia, única dentro del marco. */
export function newStageKey(label: string, taken: ReadonlySet<string>): string {
  const slug =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "etapa";
  let key = slug;
  for (let n = 2; taken.has(key); n++) key = `${slug}_${String(n)}`;
  return key;
}

/** Problemas del marco en edición (espejo de `playbookIssues` del servidor). */
export function playbookIssues(stages: readonly PlaybookStage[], opening: string): string[] {
  // Espejo COMPLETO de `playbookIssues` del servidor (playbook_patch.ts), mismos
  // textos: la barra dice lo mismo que diría el 422 (auditoría M5). La clave
  // de una etapa nueva la pone `newStageKey` y siempre cumple el patrón.
  const issues: string[] = [];
  if (stages.length < PLAYBOOK_LIMITS.min_stages || stages.length > PLAYBOOK_LIMITS.max_stages) {
    issues.push(
      `El marco lleva entre ${String(PLAYBOOK_LIMITS.min_stages)} y ${String(PLAYBOOK_LIMITS.max_stages)} etapas.`,
    );
  }
  if (stages[0]?.key !== "apertura") issues.push("La primera etapa es la apertura.");
  if (stages.at(-1)?.key !== "cierre") issues.push("La última etapa es el cierre.");
  const seen = new Set<string>();
  stages.forEach((stage, index) => {
    const name = stage.label.trim() === "" ? `La etapa ${String(index + 1)}` : `«${stage.label.trim()}»`;
    if (seen.has(stage.key)) issues.push(`${name} repite la clave «${stage.key.slice(0, 40)}».`);
    seen.add(stage.key);
    if (stage.label.trim() === "" || stage.label.length > PLAYBOOK_LIMITS.label) {
      issues.push(`${name} necesita un nombre de hasta ${String(PLAYBOOK_LIMITS.label)} caracteres.`);
    }
    if (stage.goal.trim() === "" || stage.goal.length > PLAYBOOK_LIMITS.text) {
      issues.push(`${name} necesita un objetivo de hasta ${String(PLAYBOOK_LIMITS.text)} caracteres.`);
    }
    if (stage.advance_when.trim() === "" || stage.advance_when.length > PLAYBOOK_LIMITS.text) {
      issues.push(`${name} necesita decir cuándo avanza (hasta ${String(PLAYBOOK_LIMITS.text)} caracteres).`);
    }
    for (const [list, label] of [
      [stage.must, "Siempre"],
      [stage.never, "Nunca"],
    ] as const) {
      if (list.length > PLAYBOOK_LIMITS.list_items) {
        issues.push(`${name}: «${label}» admite hasta ${String(PLAYBOOK_LIMITS.list_items)} reglas.`);
      }
      if (list.some((item) => item.trim() === "" || item.length > PLAYBOOK_LIMITS.list_item)) {
        issues.push(`${name}: cada regla de «${label}» va de 1 a ${String(PLAYBOOK_LIMITS.list_item)} caracteres.`);
      }
    }
  });
  if (opening.length > PLAYBOOK_LIMITS.opening) {
    issues.push(`La guía de apertura va hasta ${String(PLAYBOOK_LIMITS.opening)} caracteres.`);
  }
  return issues;
}

/** Las etapas fijas no se quitan ni se mueven: el marco empieza y termina con ellas. */
export function isFixedStage(stage: PlaybookStage): boolean {
  return stage.key === "apertura" || stage.key === "cierre";
}

/** Mueve una etapa del medio; la apertura y el cierre quedan en su sitio. */
export function moveStage(stages: readonly PlaybookStage[], index: number, delta: -1 | 1): PlaybookStage[] {
  const target = index + delta;
  const next = [...stages];
  const stage = next[index];
  const other = next[target];
  if (stage === undefined || other === undefined || isFixedStage(stage) || isFixedStage(other)) {
    return next;
  }
  next[index] = other;
  next[target] = stage;
  return next;
}

/** ¿Cambió algo respecto al marco guardado? (la barra de guardar solo existe si sí). */
export function playbookDirty(
  saved: Pick<PlaybookView, "enabled" | "playbook">,
  draft: { enabled: boolean; opening_guidance: string; stages: readonly PlaybookStage[] },
): boolean {
  return (
    saved.enabled !== draft.enabled ||
    saved.playbook.opening_guidance !== draft.opening_guidance ||
    JSON.stringify(saved.playbook.stages) !== JSON.stringify(draft.stages)
  );
}

/** Etiqueta de una etapa por su clave (lo que guarda `last_stage`). */
export function stageLabel(stages: readonly { key: string; label: string }[], key: string | null): string | null {
  if (key === null) return null;
  return stages.find((stage) => stage.key === key)?.label ?? key;
}

/** La etapa donde más llamadas se quedan: la mayor caída entre dos etapas. */
export function biggestDrop(type: FunnelType): { from: string; to: string; lost: number } | null {
  let best: { from: string; to: string; lost: number } | null = null;
  for (let i = 1; i < type.stages.length; i++) {
    const prev = type.stages[i - 1];
    const stage = type.stages[i];
    if (prev === undefined || stage === undefined) continue;
    const lost = prev.reached - stage.reached;
    if (lost > 0 && (best === null || lost > best.lost)) best = { from: prev.label, to: stage.label, lost };
  }
  return best;
}
