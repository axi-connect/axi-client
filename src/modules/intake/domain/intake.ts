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

/**
 * Un dato SALTADO con motivo (hotfix de cobertura tras la prueba real de
 * EasyPosWeb): desde entonces cada pregunta del guion se hace una vez, y la
 * forma de no contestarla es saltarla — con una palabra y anotado. `niche` es
 * lo que el tipo de negocio descartó antes de preguntar (a un SaaS no se le
 * pregunta por zonas de envío); es reversible con un toque.
 */
export type IntakeSkipReason = "no_aplica" | "no_sabe" | "luego";
export type IntakeSkipSource = "chat" | "ficha" | "niche";

export interface IntakeFieldSkip {
  reason: IntakeSkipReason;
  source: IntakeSkipSource;
  note: string | null;
}

export interface IntakeQuestionOption {
  label: string;
  hint: string | null;
}

export interface IntakeQuestion {
  question: string;
  options: IntakeQuestionOption[];
  allow_free_text: boolean;
  /** «¿Por qué lo pregunto?»: contexto o ejemplo que se pinta PLEGADO bajo la pregunta. */
  why: string | null;
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
  /** Saltado con motivo; `null` si no. Un dato saltado no tiene valor. */
  skipped: IntakeFieldSkip | null;
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
  /** Cobertura por campo: contestados, saltados con motivo, y sin preguntar. */
  answered: number;
  skipped: number;
  open: number;
  total: number;
  deferred: boolean;
  status: TopicStatus;
}

export interface IntakeProgress {
  topics: TopicProgress[];
  percent: number;
  next_topic: string | null;
  /** El siguiente dato por preguntar, en el orden del guion. */
  next_field: string | null;
  has_pending_required: boolean;
  has_pending_confirmation: boolean;
  /**
   * Lo esencial confirmado DE VERDAD: la barra principal de la ficha (informe
   * de la entrevista, rec. 9). Lo encontrado en la web sin confirmar no cuenta.
   * `complete` = ningún obligatorio sin preguntar: se ofrece la revisión final.
   */
  essential: { confirmed: number; total: number; complete: boolean };
  /** Lo encontrado o propuesto que espera la revisión de la persona. */
  pending_review: number;
  /** Lo siguiente que preguntará Alba (solo lo abierto). */
  next_ask: { topic: string; field: string } | null;
}

/** Los pasos de activación que Alba no resuelve y se le dicen a la persona. */
export type ActivationStep =
  | "niche"
  | "business_hours"
  | "catalog"
  | "agents"
  | "whatsapp"
  | "channel_agent";

/**
 * Qué queda listo, qué pone la persona y qué le falta para que el asistente
 * atienda de verdad. Lo calcula el servidor y viaja con el cierre; solo llega
 * cuando la conversación terminó. El copy es del servidor: aquí solo se pinta.
 */
export interface IntakeSummary {
  /** Cuántos datos con destino automático se aplican (o ya se aplicaron). */
  axi_applies: number;
  /** true = plataforma ya aplicó. */
  applied: boolean;
  you_do: { label: string; value: string; where: string }[];
  to_activate: { step: ActivationStep; label: string; where: string }[];
  /**
   * La meta del mes y lo que implica (método comercial F7). `null` si no hay
   * meta ni la entrevista la recogió; antes de aplicar es una previsualización
   * con lo confirmado. Opcional: un servidor anterior a F7 no lo manda.
   * Espejo de `Schemas["IntakeSessionViewDto"]["summary"]["goal"]` (este
   * dominio se escribe a mano, como el resto del contrato de Alba).
   */
  goal?: IntakeGoalSummary | null;
}

export interface IntakeGoalSummary {
  target_cents: number;
  currency: string;
  /** «octubre» */
  month_label: string;
  /** `null` mientras el plan no tenga ticket. */
  needed_sales: number | null;
  avg_ticket_cents: number | null;
  last_month_revenue_cents: number | null;
  /** Variación entera frente al mes pasado («36»); `null` sin mes pasado. */
  delta_pct: number | null;
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
  summary: IntakeSummary | null;
  /** La persona vuelve a una entrevista a medias: qué falta. `null` si no aplica. */
  resume: { missing_topics: string[]; pending_review: number } | null;
}

export interface IntakeTurnResult {
  reply: string;
  question: IntakeQuestion | null;
  captured: { code: string; label: string }[];
  progress: IntakeProgress;
  finished: boolean;
  closing: string | null;
  /** Solo al terminar: el resumen que se pinta bajo el cierre. */
  summary: IntakeSummary | null;
  turns_left: number;
  /**
   * Lo capturado con su valor normalizado y su texto legible: la ficha se
   * pinta desde aquí, sin volver a pedir la sesión entera tras cada turno.
   */
  captured_values: {
    code: string;
    value: unknown;
    display: string | null;
    /** `stated` si lo dijo la persona; `proposed` si lo acaba de proponer su tipo de negocio. */
    source: IntakeAnswerSource | null;
  }[];
  /** Lo saltado en este turno, con su motivo: la ficha lo pinta desde aquí. */
  skipped_now: { code: string; label: string; reason: IntakeSkipReason; source: IntakeSkipSource }[];
  /** Códigos cuyo valor desapareció en este turno (una propuesta rechazada). */
  removed: string[];
  /** Saltos del tipo de negocio anterior que volvieron a estar por preguntar. */
  reopened: string[];
}

export interface PatchAnswersResult {
  progress: IntakeProgress;
  applied: string[];
  rejected: { field_code: string; reason: string }[];
  skipped: string[];
  unskipped: string[];
}

/**
 * Lo que dice la cabecera de la ficha, en el orden del informe de la entrevista
 * (rec. 9 y 10): lo esencial confirmado, lo que espera tu revisión, lo que
 * quedó por definir y lo que no aplica. Antes se contaba como «lleno» todo lo
 * que tenía valor —incluido lo encontrado en la web sin confirmar— y se llamaba
 * «no aplica» a cualquier salto, también a un «no lo sé».
 */
export function fichaCounts(
  topics: IntakeTopicView[],
  progress: IntakeProgress,
): { confirmed: number; total: number; review: number; undefined: number; later: number; notApplicable: number } {
  const skips = topics.flatMap((topic) => topic.fields).flatMap((field) =>
    field.value === null && field.skipped !== null ? [field.skipped] : [],
  );
  return {
    confirmed: progress.essential.confirmed,
    total: progress.essential.total,
    review: progress.pending_review,
    undefined: skips.filter((skip) => skip.reason === "no_sabe").length,
    later: skips.filter((skip) => skip.reason === "luego").length,
    notApplicable: skips.filter((skip) => skip.reason === "no_aplica").length,
  };
}

/**
 * Lo encontrado o propuesto que espera un «así es», en el orden del guion: la
 * cola de las tarjetas de revisión del hilo (paso 1 del informe).
 */
export function reviewQueue(topics: IntakeTopicView[]): IntakeField[] {
  return topics.flatMap((topic) => topic.fields.filter((field) => field.needs_confirmation));
}

/**
 * El estado de un tema, en palabras y con su forma: el color no puede ser lo
 * único que lo diga (informe, rec. 10 y 17). Origen del dato y estado del tema
 * van separados: «Tu asistente» no sale «Confirmado» por llevar algo precargado.
 */
export type TopicTone = "done" | "now" | "review" | "waiting" | "deferred";

export function topicState(topic: TopicProgress): { label: string; tone: TopicTone } {
  if (topic.deferred) return { label: "Pospuesto · lo retomamos al final", tone: "deferred" };
  if (topic.status === "done") return { label: "Confirmado", tone: "done" };
  if (topic.pending_confirmation > 0) {
    return {
      label:
        topic.pending_confirmation === 1
          ? "Pendiente de confirmar · 1 dato"
          : `Pendiente de confirmar · ${String(topic.pending_confirmation)} datos`,
      tone: "review",
    };
  }
  if (topic.status === "in_progress") {
    return {
      label: `En curso · ${String(topic.answered + topic.skipped)} de ${String(topic.total)}`,
      tone: "now",
    };
  }
  return { label: "Sin empezar", tone: "waiting" };
}

/** El tema que toca ahora: el que está en curso, o el siguiente que preguntará Alba. */
export function currentTopic(progress: IntakeProgress): TopicProgress | null {
  return (
    progress.topics.find((topic) => topic.status === "in_progress" && !topic.deferred) ??
    progress.topics.find((topic) => topic.code === (progress.next_ask?.topic ?? progress.next_topic)) ??
    null
  );
}

/**
 * Lo que la fila dice de un dato saltado. Es copy del producto: quien lo lee
 * es la persona, no plataforma, y tiene que entender en media línea por qué no
 * hay nada ahí y que puede revertirlo.
 */
export function skipLabel(skip: IntakeFieldSkip): string {
  if (skip.source === "niche") return "No aplica a tu tipo de negocio";
  switch (skip.reason) {
    case "no_aplica":
      return "No aplica";
    // «Por definir», no «No lo sabías»: no saber algo no es un reproche, y no
    // equivale a que no aplique (informe de la entrevista, rec. 6).
    case "no_sabe":
      return "Por definir";
    case "luego":
      return "Para después";
    default:
      return "Saltado";
  }
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

/**
 * Los tipos que se corrigen elemento a elemento en vez de en una caja de texto.
 *
 * La diferencia importa cuando el valor llega PROPUESTO: una propuesta trae
 * cuatro o cinco elementos ya escritos, y lo que alguien va a hacer con ella es
 * quitar uno y renombrar otro. En una caja de texto separada por comas eso
 * obliga a releerla entera y a reescribirla sin equivocarse con las comas, y
 * entonces corregir cuesta lo mismo que dictar de cero — o sea, proponer no
 * sirvió de nada.
 */
const STRUCTURED_LIST_KINDS: ReadonlySet<IntakeFieldKind> = new Set<IntakeFieldKind>([
  "list",
  "multi_choice",
]);

export function isStructuredList(kind: IntakeFieldKind): boolean {
  return STRUCTURED_LIST_KINDS.has(kind);
}

/** El valor crudo como lista de textos. Lo que no lo sea sale vacío. */
export function toListItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string | number => typeof item === "string" || typeof item === "number")
    .map((item) => String(item).trim())
    .filter((item) => item !== "");
}

/**
 * La línea que acompaña al editor: qué se va a hacer con la lista.
 *
 * Es literal la regla del agregado del servidor —solo se AÑADE lo que falte y
 * nada de lo que ya existe se reordena ni se borra— y se dice aquí porque es la
 * duda real de quien está a punto de tocar el embudo de su CRM. El `help` del
 * guion gana cuando lo hay: lo escribió quien montó ese campo.
 */
export function handoffNote(kind: IntakeFieldKind, help: string | null): string {
  if (help !== null && help.trim() !== "") return help;
  return isStructuredList(kind)
    ? "Solo se añade lo que falte. Nada de lo que ya tengas se reordena ni se borra."
    : "";
}

/** El valor actual, en texto editable. */
export function draftOf(field: Pick<IntakeField, "value">): string {
  if (field.value === null || field.value === undefined) return "";
  if (Array.isArray(field.value)) return field.value.map((item) => String(item)).join(", ");
  if (typeof field.value === "boolean") return field.value ? "sí" : "no";
  return String(field.value);
}

/**
 * El texto editado, de vuelta al tipo del campo. `null` = no se pudo
 * interpretar. La validación de verdad la hace el backend, con el mismo
 * normalizador que usa el asistente; esto solo evita mandar una lista vacía o
 * un texto en blanco.
 */
export function valueFromDraft(field: Pick<IntakeField, "kind">, draft: string): unknown {
  const trimmed = draft.trim();
  if (trimmed === "") return null;
  switch (field.kind) {
    case "list":
    case "multi_choice":
      return trimmed
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "");
    case "boolean":
      return ["sí", "si", "true", "1"].includes(trimmed.toLowerCase());
    default:
      return trimmed;
  }
}
