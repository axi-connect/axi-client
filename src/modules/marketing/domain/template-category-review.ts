import type { Schemas } from "@/core/api/types";
import type { TemplateButton } from "./template-pieces";

/**
 * Jev en el constructor de plantillas (hotfix 131049). Módulo PURO: el
 * contrato, cuándo vale la pena preguntar y qué hacer con la respuesta.
 *
 * Por qué existe: `welcome_trial_v2` salió como marketing por una oferta, una
 * fecha de cobro, medios de pago y un eslogan, y Meta la frenó (131049) con un
 * contacto que nunca había escrito. Decirlo ANTES de someterla es más barato
 * que descubrirlo con la bienvenida sin llegar.
 */

export type TemplateDraftTextDTO = Schemas["TemplateDraftTextDto"];
export type TemplateCategoryReview = Schemas["TemplateCategoryReviewDto"];
export type CategorySignal = TemplateCategoryReview["signals"][number];
export type ReviewedCategory = TemplateCategoryReview["category"];
export type UtilityRewrite = NonNullable<Schemas["UtilityRewriteResultDto"]["proposal"]>;

/** Menos que esto aún no dice nada: no se gasta una revisión. */
export const REVIEWABLE_MIN_CHARS = 40;
/** Pausa al escribir tras la que Jev lee el borrador. */
export const REVIEW_IDLE_MS = 1_800;

export interface DraftPieces {
  headerText: string | null;
  body: string;
  footer: string | null;
  buttons: readonly TemplateButton[];
}

/** Solo el TEXTO del borrador: la media de la cabecera no cambia la categoría. */
export function reviewDraftOf(pieces: DraftPieces): TemplateDraftTextDTO {
  const labels = pieces.buttons.flatMap((button) => (button.type === "copy_code" ? [] : [button.text.trim()]));
  return {
    header: blankToNull(pieces.headerText),
    body: pieces.body.trim(),
    footer: blankToNull(pieces.footer),
    ...(labels.some((label) => label.length > 0) ? { buttons: labels.filter((label) => label.length > 0) } : {}),
  };
}

/**
 * La huella con la que se decide si el texto CAMBIÓ de verdad: mayúsculas y
 * espacios no cambian la categoría (el servidor normaliza igual), así que no
 * disparan otra revisión.
 */
export function reviewKey(draft: TemplateDraftTextDTO): string {
  const normalize = (text: string | null | undefined) => (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  return JSON.stringify([
    normalize(draft.header),
    normalize(draft.body),
    normalize(draft.footer),
    (draft.buttons ?? []).map(normalize),
  ]);
}

export function isReviewable(draft: TemplateDraftTextDTO): boolean {
  return draft.body.length >= REVIEWABLE_MIN_CHARS && draft.body.length <= 1024;
}

/**
 * Qué hace Jev con la categoría del formulario:
 * - `auto`: el usuario no la eligió y la revisión es clara → la cambia sola;
 * - `suggest`: la eligió él (o no está clara) → lo propone, el usuario decide;
 * - `none`: coincide, está bloqueada (aprobada) o es autenticación (que el
 *   constructor no crea: solo se informa).
 */
export function categoryAction(input: {
  current: "marketing" | "utility" | "authentication";
  review: Pick<TemplateCategoryReview, "category" | "confident">;
  touched: boolean;
  locked: boolean;
}): "auto" | "suggest" | "none" {
  const { current, review, touched, locked } = input;
  if (locked || review.category === current || review.category === "authentication") return "none";
  return !touched && review.confident ? "auto" : "suggest";
}

/** «92 %» de la categoría elegida, o `null` si solo hablaron las reglas. */
export function confidenceLabel(review: Pick<TemplateCategoryReview, "confidence">): string | null {
  return review.confidence === null ? null : `${String(Math.round(review.confidence * 100))} %`;
}

/** La etiqueta corta de cada señal, la que va delante de la frase citada. */
export const SIGNAL_TAGS: Record<CategorySignal["kind"], string> = {
  conversion_offer: "Oferta",
  payment_details: "Pago",
  promo_language: "Tono",
  promo_emoji: "Emoji",
  marketing_cta: "Botón",
  otp: "Código",
};

/** Cuántas frases cita Jev: tres bastan para entender el porqué. */
export const SIGNAL_LINES_MAX = 3;

/**
 * Las frases a citar, una por frase (la misma puede disparar varias señales:
 * manda la primera, que es la más fuerte en el orden del servidor). Sin las de
 * código: no explican por qué es marketing.
 */
export function signalLines(signals: readonly CategorySignal[]): { tag: string; phrase: string; reason: string }[] {
  const lines = new Map<string, { tag: string; phrase: string; reason: string }>();
  for (const signal of signals) {
    if (signal.kind === "otp" || lines.has(signal.phrase)) continue;
    lines.set(signal.phrase, {
      tag: SIGNAL_TAGS[signal.kind],
      phrase: signal.phrase,
      reason: signal.reason,
    });
  }
  return [...lines.values()].slice(0, SIGNAL_LINES_MAX);
}

/**
 * Los ejemplos de la propuesta: `variables[i]` es la variable del original de
 * la que viene la nueva `{{i+1}}`, así cada una conserva el suyo.
 */
export function remapExamples(examples: readonly string[], variables: readonly number[]): string[] {
  return variables.map((index) => examples[index - 1] ?? "");
}

function blankToNull(text: string | null): string | null {
  const trimmed = (text ?? "").trim();
  return trimmed.length === 0 ? null : trimmed;
}
