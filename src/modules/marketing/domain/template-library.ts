import type { HsmLibraryTemplateDTO, HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import { humanizeTemplateBase } from "@/modules/marketing/domain/template-name";
import type { TemplateButton } from "@/modules/marketing/domain/template-pieces";

/**
 * La biblioteca de plantillas de Meta en el cliente (hsm-media F5): cómo se
 * llama cada una en español, qué recibe el formulario al elegirla y cuándo
 * sigue siendo «de la biblioteca».
 *
 * Lo que importa de verdad es `isStillLibrary`: Meta aprueba al instante una
 * plantilla de su biblioteca SOLO si el texto fijo no cambió. Si el operador lo
 * toca, se envía como una propia —sin `library_template_name`— y pasa por la
 * revisión normal. Mandar el nombre de la biblioteca con un texto cambiado haría
 * que Meta creara la SUYA, no la que el operador ve en la previa.
 */

/** Los casos de uso, como los nombra el operador. Otro que llegue cae en «Otros». */
export const LIBRARY_TOPIC_LABELS: Record<string, string> = {
  PAYMENTS: "Pagos",
  ORDER_MANAGEMENT: "Pedidos y envíos",
  ACCOUNT_UPDATES: "Cuenta",
  EVENT_REMINDER: "Recordatorios",
  IDENTITY_VERIFICATION: "Verificación",
  CUSTOMER_FEEDBACK: "Opiniones",
};

export const LIBRARY_TOPIC_FALLBACK = "Otros";

export function libraryTopicLabel(topic: string): string {
  return LIBRARY_TOPIC_LABELS[topic] ?? LIBRARY_TOPIC_FALLBACK;
}

/**
 * Títulos en español de los casos de uso más comunes. Sin cabecera, es lo que
 * nombra la tarjeta; uno que no esté aquí cae al nombre de la biblioteca.
 */
const LIBRARY_USECASE_TITLES: Record<string, string> = {
  AUTO_PAY_REMINDER: "Recordatorio de pago automático",
  PAYMENT_REMINDER: "Recordatorio de pago",
  PAYMENT_DUE_REMINDER: "Recordatorio de pago",
  PAYMENT_CONFIRMATION: "Pago recibido",
  PAYMENT_SCHEDULED: "Pago programado",
  PAYMENT_OVERDUE: "Pago vencido",
  PAYMENT_ACTION_REQUIRED: "Pago pendiente",
  PAYMENT_REJECT_FAIL: "Pago rechazado",
  LOW_BALANCE_WARNING: "Saldo bajo",
  TRANSACTION_ALERT: "Alerta de movimiento",
  STATEMENT_AVAILABLE: "Extracto disponible",
  RECEIPT_ATTACHMENT: "Recibo de pago",
  ORDER_CONFIRMATION: "Pedido confirmado",
  ORDER_DELAY: "Pedido demorado",
  ORDER_PICK_UP: "Pedido listo para recoger",
  ORDER_ACTION_NEEDED: "Pedido pendiente",
  ORDER_OR_TRANSACTION_CANCEL: "Pedido cancelado",
  SHIPMENT_CONFIRMATION: "Pedido enviado",
  DELIVERY_UPDATE: "Pedido en camino",
  DELIVERY_CONFIRMATION: "Pedido entregado",
  DELIVERY_FAILED: "Entrega fallida",
  RETURN_CONFIRMATION: "Devolución confirmada",
  ACCOUNT_CREATION_CONFIRMATION: "Cuenta creada",
  ACCOUNT_UPDATE: "Cambio en tu cuenta",
  FRAUD_ALERT: "Alerta de seguridad",
  APPOINTMENT_REMINDER: "Recordatorio de cita",
  APPOINTMENT_CONFIRMATION: "Cita confirmada",
  EVENT_REMINDER: "Recordatorio de evento",
  EVENT_DETAILS_REMINDER: "Detalles del evento",
  FEEDBACK_SURVEY: "¿Cómo te fue?",
  IDENTITY_VERIFICATION: "Verificación de identidad",
};

const VARIABLE = /\{\{\d+\}\}/;

/**
 * Cómo se llama en español: la cabecera si la tiene (y no lleva hueco: «Tu
 * pedido {{1}}» no nombra nada), si no el caso de uso, y si tampoco, el nombre
 * de la biblioteca legible sin su número (`auto_pay_reminder_1` → «Auto pay reminder»).
 */
export function libraryTitle(template: Pick<HsmLibraryTemplateDTO, "header" | "usecase" | "name">): string {
  const header = template.header?.trim() ?? "";
  if (header !== "" && !VARIABLE.test(header)) return header;
  const byUsecase = LIBRARY_USECASE_TITLES[template.usecase];
  if (byUsecase !== undefined) return byUsecase;
  return humanizeTemplateBase(template.name.replace(/_\d+$/, ""));
}

/** Lo que recibe el formulario al elegir una plantilla de la biblioteca. */
export interface LibraryDraft {
  category: Extract<HsmTemplateDTO["category"], "utility">;
  /** `es`, el español neutro de la biblioteca: así se aprueba al instante. */
  language: "es";
  /** La cabecera de texto, o `null` si no trae. */
  headerText: string | null;
  /** El ejemplo del `{{1}}` de la cabecera, si lo lleva. */
  headerExample: string | null;
  body: string;
  examples: string[];
  footer: string | null;
  buttons: TemplateButton[];
  /** El nombre como lo diría el operador: el título. La página lo pasa al formato de Meta. */
  suggestedName: string;
}

export function libraryDraft(template: HsmLibraryTemplateDTO): LibraryDraft {
  return {
    category: "utility",
    language: "es",
    headerText: template.header,
    headerExample: template.header_example,
    body: template.body,
    examples: [...template.body_examples],
    footer: template.footer,
    buttons: template.buttons.map(toTemplateButton),
    suggestedName: libraryTitle(template),
  };
}

/** Copia: el formulario edita sus botones y no puede tocar los de la biblioteca cargada. */
function toTemplateButton(button: HsmLibraryTemplateDTO["buttons"][number]): TemplateButton {
  switch (button.type) {
    case "quick_reply":
      return { type: "quick_reply", text: button.text };
    case "url":
      return { type: "url", text: button.text, url: button.url };
    case "phone_number":
      return { type: "phone_number", text: button.text, phone_number: button.phone_number };
  }
}

/** Lo que el formulario lleva ahora, en lo que decide si sigue siendo de la biblioteca. */
export interface LibraryComparable {
  category: HsmTemplateDTO["category"];
  language: string;
  /** La cabecera de TEXTO, o `null` (ninguna o de medio). */
  header: string | null;
  /** Si eligió una cabecera de imagen, video o documento: la biblioteca no las trae. */
  hasMediaHeader: boolean;
  body: string;
  footer: string | null;
  buttons: readonly TemplateButton[];
}

/**
 * Si lo que hay en el formulario sigue siendo la plantilla de la biblioteca: el
 * texto fijo (cabecera, cuerpo, pie), los botones —tipo, texto y orden— y el
 * idioma `es`, sin tocar. Lo ÚNICO que puede cambiar es el enlace o el teléfono
 * de un botón, que son del negocio, y los ejemplos, que no son texto fijo.
 *
 * La categoría también cuenta: la biblioteca es solo de utilidad, y quien la
 * pasa a Marketing está enviando otra cosa —se manda como propia, no se le
 * cambia la categoría en silencio—.
 */
export function isStillLibrary(origin: HsmLibraryTemplateDTO, current: LibraryComparable): boolean {
  if (current.category !== "utility" || current.language !== "es") return false;
  if (current.hasMediaHeader || current.header !== origin.header) return false;
  if (current.body !== origin.body || current.footer !== origin.footer) return false;
  if (current.buttons.length !== origin.buttons.length) return false;
  return origin.buttons.every((button, index) => {
    const now = current.buttons[index];
    return now !== undefined && now.type === button.type && "text" in now && now.text === button.text;
  });
}

const PLACEHOLDER_HOSTS = new Set(["example.com", "www.example.com"]);

/** Si el enlace apunta al de ejemplo de Meta (con o sin `https://`). */
function isPlaceholderUrl(raw: string): boolean {
  const value = raw.trim();
  if (value === "") return false;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    return PLACEHOLDER_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Un botón de enlace que sigue en el `example.com` de Meta: bloquea el envío.
 * La biblioteca los trae así y, aprobada al instante, la plantilla mandaría a
 * cada cliente a una página que no es del negocio. Se nombra el botón, que es
 * lo que el operador ve.
 */
export function placeholderButtonIssue(buttons: readonly TemplateButton[]): string | null {
  const button = buttons.find((item) => item.type === "url" && isPlaceholderUrl(item.url));
  if (button === undefined || button.type !== "url") return null;
  return `Pon la dirección de tu negocio en «${button.text.trim() || "el botón de enlace"}»`;
}

/** Sin tildes ni mayúsculas: «Cita» encuentra «cita» y «pago» encuentra «Pagó». */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Lo que enseña la hoja: las del caso de uso elegido (`null` = todas) que
 * contengan lo buscado en su título, su texto, su caso de uso o su tema.
 */
export function filterLibrary(
  templates: readonly HsmLibraryTemplateDTO[],
  query: string,
  topic: string | null,
): HsmLibraryTemplateDTO[] {
  const needle = normalize(query.trim());
  return templates.filter((template) => {
    if (topic !== null && template.topic !== topic) return false;
    if (needle === "") return true;
    const haystack = [libraryTitle(template), template.body, template.usecase.replace(/_/g, " "), libraryTopicLabel(template.topic)]
      .map(normalize)
      .join("\n");
    return haystack.includes(needle);
  });
}

/** Los temas que de verdad hay en la lista, en el orden de las etiquetas y los desconocidos al final. */
export function libraryTopics(templates: readonly HsmLibraryTemplateDTO[]): string[] {
  const present = new Set(templates.map((template) => template.topic));
  const known = Object.keys(LIBRARY_TOPIC_LABELS).filter((topic) => present.has(topic));
  const unknown = [...present].filter((topic) => !(topic in LIBRARY_TOPIC_LABELS)).sort();
  return [...known, ...unknown];
}

/**
 * Las que se asoman en «Empieza desde»: una por tema, en el orden de la maqueta
 * (pagos, pedidos, opiniones, cuenta…), y si no llegan, las siguientes de la
 * lista. Cuatro bastan: la biblioteca entera está a un clic.
 */
export function libraryHighlights(templates: readonly HsmLibraryTemplateDTO[], count = 4): HsmLibraryTemplateDTO[] {
  const order = ["PAYMENTS", "ORDER_MANAGEMENT", "CUSTOMER_FEEDBACK", "ACCOUNT_UPDATES", "EVENT_REMINDER"];
  const picked: HsmLibraryTemplateDTO[] = [];
  for (const topic of order) {
    const first = templates.find((template) => template.topic === topic);
    if (first !== undefined) picked.push(first);
    if (picked.length >= count) return picked;
  }
  for (const template of templates) {
    if (picked.length >= count) break;
    if (!picked.includes(template)) picked.push(template);
  }
  return picked;
}

/**
 * El cuerpo partido en texto y huecos, con cada `{{n}}` cambiado por su
 * ejemplo: la hoja resalta los ejemplos para que se vea qué rellena el negocio.
 * Un hueco sin ejemplo se deja tal cual.
 */
export function libraryBodyParts(body: string, examples: readonly string[]): Array<{ text: string; example: boolean }> {
  const parts: Array<{ text: string; example: boolean }> = [];
  let last = 0;
  for (const match of body.matchAll(/\{\{(\d+)\}\}/g)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ text: body.slice(last, at), example: false });
    const sample = examples[Number(match[1]) - 1];
    parts.push({ text: sample !== undefined && sample.trim() !== "" ? sample : match[0], example: true });
    last = at + match[0].length;
  }
  if (last < body.length) parts.push({ text: body.slice(last), example: false });
  return parts;
}
