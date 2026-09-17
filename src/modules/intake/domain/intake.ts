/**
 * Contrato de la puesta en marcha conversacional.
 * Plan: `axi-server/docs/plans/conversational_intake_plan.md`.
 *
 * Dominio PURO: sin React, sin http, sin zod.
 *
 * El tipo que hay que entender antes que ninguno es `IntakeAnswerSource`. Es lo
 * que permite que la pantalla distinga tres cosas que se ven parecidas y no lo
 * son: lo que axi ya sabía, lo que la IA dedujo del sitio web del negocio (una
 * hipótesis, hay que confirmarla) y lo que la persona dijo. Sin esa distinción
 * la ficha sería una lista de datos sin procedencia, y confirmar dejaría de
 * tener sentido.
 */

export type IntakeFieldKind =
  | "text"
  | "long_text"
  | "number"
  | "money"
  | "email"
  | "phone"
  | "url"
  | "choice"
  | "multi_choice"
  | "boolean"
  | "weekly_hours"
  | "faq_list"
  | "list";

/**
 * `proposed` (F2): lo propuso el catálogo de nichos. Como `derived`, necesita un
 * «así es» antes de aplicarse — pero su procedencia no es una web sino el tipo
 * de negocio, y la ficha lo dice así.
 */
export type IntakeAnswerSource = "known" | "derived" | "stated" | "proposed";

export interface IntakeQuestionOption {
  label: string;
  hint: string | null;
}

export interface IntakeQuestion {
  question: string;
  options: IntakeQuestionOption[];
  allow_free_text: boolean;
}

export interface IntakeMessage {
  id: string;
  role: "assistant" | "client";
  body: string;
  question: IntakeQuestion | null;
  /** Lo que ese turno capturó: las pastillas bajo el mensaje. */
  captured: { code: string; label: string }[];
  voice: boolean;
  created_at: string;
}

export interface IntakeField {
  code: string;
  label: string;
  kind: IntakeFieldKind;
  required: boolean;
  help: string | null;
  options: string[] | null;
  /** El valor crudo, para editarlo en su propio control. */
  value: unknown;
  /** El valor ya legible, para pintarlo sin interpretar el tipo. */
  display: string | null;
  source: IntakeAnswerSource | null;
  /** Lo dedujo la IA de su web y falta un sí o un no. */
  needs_confirmation: boolean;
}

export interface IntakeTopicView {
  code: string;
  title: string;
  fields: IntakeField[];
}

export type TopicStatus = "done" | "in_progress" | "pending" | "deferred";

export interface TopicProgress {
  code: string;
  title: string;
  required: number;
  resolved: number;
  pending_confirmation: number;
  captured: number;
  total: number;
  deferred: boolean;
  status: TopicStatus;
}

export interface IntakeProgress {
  topics: TopicProgress[];
  percent: number;
  next_topic: string | null;
  has_pending_required: boolean;
  has_pending_confirmation: boolean;
}

export interface IntakeSessionView {
  status: "in_progress" | "completed" | "applied";
  assistant_name: string;
  company_name: string;
  invite_name: string | null;
  estimated_minutes: number;
  turns_left: number;
  voice_enabled: boolean;
  messages: IntakeMessage[];
  topics: IntakeTopicView[];
  progress: IntakeProgress;
  closing: string | null;
}

export interface IntakeTurnResult {
  reply: string;
  question: IntakeQuestion | null;
  captured: { code: string; label: string }[];
  progress: IntakeProgress;
  finished: boolean;
  closing: string | null;
  turns_left: number;
  /**
   * Lo capturado con su valor normalizado y su texto legible: la ficha se
   * pinta desde aquí, sin volver a pedir la sesión entera tras cada turno.
   */
  captured_values: { code: string; value: unknown; display: string | null }[];
}

export interface PatchAnswersResult {
  progress: IntakeProgress;
  applied: string[];
  rejected: { field_code: string; reason: string }[];
}

/**
 * Cuántos datos se han recogido de verdad.
 *
 * Cuenta campos, no temas — al revés que el progreso de la barra. No es una
 * incoherencia: la barra mide AVANCE (y ahí lo que importa es cerrar temas,
 * porque «12 de 37 campos» desanima y «vamos por el tercero de seis» anima),
 * mientras que esto mide lo que hay EN LA FICHA, donde la unidad natural es el
 * dato. Son dos preguntas distintas con dos respuestas distintas.
 */
export function countCaptured(topics: IntakeTopicView[]): { filled: number; total: number } {
  const all = topics.flatMap((topic) => topic.fields);
  return { filled: all.filter((field) => field.value !== null).length, total: all.length };
}

/** Los datos deducidos de la web que siguen esperando un sí o un no. */
export function pendingConfirmations(topics: IntakeTopicView[]): IntakeField[] {
  return topics.flatMap((topic) => topic.fields.filter((field) => field.needs_confirmation));
}

/**
 * El aliento del progreso, en palabras.
 *
 * Es copy y no un porcentaje porque un porcentaje es una auditoría. Quien
 * contesta esto no está midiendo su rendimiento: está haciéndole un favor a su
 * propio negocio entre dos cosas, en el móvil, y lo que necesita es saber que
 * queda poco.
 */
export function progressLabel(progress: IntakeProgress): string {
  const pending = progress.topics.filter(
    (topic) => !topic.deferred && topic.status !== "done",
  ).length;

  if (pending === 0) return "Ya está todo";
  if (progress.percent === 0) return "Empezamos";
  if (pending === 1) return "Queda uno";
  if (progress.percent >= 60) return "Ya casi";
  if (progress.percent >= 40) return "Vamos por la mitad";
  return `Quedan ${String(pending)}`;
}

/** Etiqueta de la procedencia de un dato. La ficha la pinta como matiz. */
export function sourceLabel(source: IntakeAnswerSource | null): string | null {
  switch (source) {
    case "known":
      return "Ya lo teníamos";
    case "derived":
      return "Lo vi en su web";
    case "proposed":
      return "Propuesto para tu tipo de negocio";
    case "stated":
      return null;
    default:
      return null;
  }
}

/**
 * Los tipos que la ficha sabe editar en línea.
 *
 * Los que faltan (`weekly_hours`, `faq_list`) no es que no se puedan recoger —
 * se recogen igual, hablando— sino que no tienen un control decente que quepa
 * en una fila de la ficha. Inventar aquí un editor de horarios semanal sería
 * reconstruir el panel dentro de la pantalla que vino a sustituirlo.
 */
const EDITABLE_KINDS: ReadonlySet<IntakeFieldKind> = new Set<IntakeFieldKind>([
  "text",
  "long_text",
  "number",
  "money",
  "email",
  "phone",
  "url",
  "choice",
  "multi_choice",
  "boolean",
  "list",
]);

export function isEditableInline(kind: IntakeFieldKind): boolean {
  return EDITABLE_KINDS.has(kind);
}
