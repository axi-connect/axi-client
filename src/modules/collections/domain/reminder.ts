/**
 * Los recordatorios de cobro, del lado del cliente (F5 del programa Cobros).
 *
 * Aquí vive la mitad de la verdad que la pantalla necesita y el wire no trae:
 * cómo se llama cada cosa en español, qué variables acepta un texto, y **por
 * qué un aviso no salió**. Esa última parte es la que da sentido a la fase: el
 * servidor registra doce razones distintas para no enviar precisamente para que
 * «el negocio apagó esa plantilla» y «el despacho está roto» dejen de verse
 * igual, y una pantalla que las pintara todas como «omitido» tiraría ese
 * trabajo a la basura.
 */
import type { Schemas } from "@/core/api/types";

export type CollectionsPolicyDTO = Schemas["CollectionsPolicyDto"];
export type ReminderTemplates = CollectionsPolicyDTO["templates"];
export type ReminderTemplateKey = keyof ReminderTemplates;
export type HsmTemplates = CollectionsPolicyDTO["hsm_templates"];
export type PlanReminderDTO = Schemas["PlanRemindersDto"]["data"][number];
export type ReminderStatus = PlanReminderDTO["status"];
export type ReminderChannel = PlanReminderDTO["channel"];
export type LastReminder = NonNullable<
  Schemas["ReceivablesListDto"]["data"][number]["last_reminder"]
>;

export const REMINDER_TEMPLATE_KEYS: readonly ReminderTemplateKey[] = [
  "due_soon",
  "due_today",
  "overdue",
];

export const REMINDER_TEMPLATE_LABELS: Record<ReminderTemplateKey, string> = {
  due_soon: "Antes de vencer",
  due_today: "El día que vence",
  overdue: "En mora",
};

/** Un ejemplo de cada texto, para que la fila diga de qué habla sin abrirla. */
export const REMINDER_TEMPLATE_HINTS: Record<ReminderTemplateKey, string> = {
  due_soon: "«…la cuota 2 de 3 vence el 16 de octubre»",
  due_today: "«…hoy vence la cuota 2 de tu pedido»",
  overdue: "«…una cuota pendiente desde el 16 de octubre»",
};

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Correo",
};

/**
 * Las variables que el servidor sabe rellenar (`collection_reminder_template.ts`).
 *
 * Es un espejo declarado a mano, y lo es a propósito: el wire no las expone, y
 * ofrecer una que el servidor no conoce dejaría `{{lo_que_sea}}` literal en el
 * WhatsApp de un cliente. `reminder-variables.test.ts` lo amarra.
 */
export const REMINDER_VARIABLES = [
  "contact_name",
  "order_number",
  "amount",
  "balance",
  "due_date",
  "installment_seq",
  "installments_count",
  "payment_methods",
] as const;

export type ReminderVariable = (typeof REMINDER_VARIABLES)[number];

export const REMINDER_VARIABLE_LABELS: Record<ReminderVariable, string> = {
  contact_name: "Nombre del cliente",
  order_number: "Número del pedido",
  amount: "Importe de la cuota",
  balance: "Saldo total del pedido",
  due_date: "Fecha de vencimiento",
  installment_seq: "Número de cuota",
  installments_count: "Total de cuotas",
  payment_methods: "Medios de pago",
};

export const MAX_TEMPLATE_BODY = 1000;

/** Las variables escritas en un texto que el servidor NO sabe rellenar. */
export function unknownReminderVariables(body: string): string[] {
  const found = body.match(/\{\{\s*(\w+)\s*\}\}/g) ?? [];
  const known = new Set<string>(REMINDER_VARIABLES);
  const bad = found
    .map((hole) => hole.replace(/[{}\s]/g, ""))
    .filter((name) => !known.has(name));
  return [...new Set(bad)];
}

/**
 * Por qué no salió un aviso, en español y sin jerga.
 *
 * Cada entrada corresponde a un `skip_reason` del despachador. Una razón que
 * no esté aquí NO se esconde: `skipReasonLabel` devuelve el código crudo, que
 * es feo pero cierto — y prefiero que el operador vea `feature_disabled` a que
 * la pantalla diga «omitido» y le oculte el motivo.
 */
export const SKIP_REASON_LABELS: Record<string, string> = {
  feature_disabled: "La cobranza está apagada en este negocio",
  plan_not_active: "El plan ya no está activo",
  installment_not_found: "La cuota ya no existe",
  installment_paid: "La cuota ya estaba pagada",
  promise_active: "El cliente prometió pagar",
  order_not_found: "El pedido ya no existe",
  stage_not_due: "Ese día ya no tocaba ese aviso",
  template_disabled: "El texto está apagado",
  outside_service_window_no_hsm:
    "Fuera de la ventana de 24 h y sin plantilla aprobada",
  contact_without_email: "El cliente no tiene correo",
  email_provider_disabled: "El correo no está configurado",
  email_failed: "El correo no se pudo enviar",
  dispatch_failed: "El envío falló antes de salir",
};

export function skipReasonLabel(reason: string | null): string {
  if (reason === null || reason === "") return "Omitido";
  return SKIP_REASON_LABELS[reason] ?? reason;
}

/**
 * Cómo acabó un aviso, en una palabra y con su tono.
 *
 * `skipped` es NEUTRO a propósito, no un fallo: casi siempre es una decisión
 * del negocio, y pintarlo en rojo junto a los errores de verdad haría que el
 * operador dejara de mirar los dos.
 */
export const REMINDER_STATUS_TONE: Record<
  ReminderStatus,
  "neutral" | "info" | "success" | "destructive"
> = {
  queued: "info",
  sent: "success",
  delivered: "success",
  failed: "destructive",
  skipped: "neutral",
};

export const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  queued: "En camino",
  sent: "Enviado",
  delivered: "Entregado",
  failed: "Falló",
  skipped: "No se envió",
};

/**
 * La etapa que nombra una clave de aviso. La clave lleva el desfase dentro
 * (`due_soon_7`) porque el unique del servidor se construye con ella.
 */
export function reminderKeyLabel(key: string): string {
  if (key === "manual") return "Enviado a mano";
  if (key === "due_today") return "El día del vencimiento";
  const before = /^due_soon_(\d+)$/.exec(key);
  if (before !== null) return `${before[1]} días antes`;
  const after = /^overdue_(\d+)$/.exec(key);
  if (after !== null) {
    return after[1] === "1" ? "1 día de mora" : `${after[1]} días de mora`;
  }
  return key;
}

/**
 * Lo que la Cartera dice de la última vez que se escribió.
 *
 * Devuelve el tono además del texto porque «no salió» tiene que poder verse
 * distinto de «entregado» sin leer: es justo lo que cambia lo que el operador
 * hace a continuación.
 */
export function lastReminderLine(
  last: LastReminder | null,
  now: Date = new Date(),
): { text: string; tone: "muted" | "warning" } {
  if (last === null) {
    return { text: "Sin avisos todavía", tone: "muted" };
  }
  const when = relativeDay(last.at, now);
  if (last.status === "skipped") {
    return {
      text: `No salió ${when} · ${skipReasonLabel(last.skip_reason)}`,
      tone: "warning",
    };
  }
  if (last.status === "failed") {
    return { text: `El aviso falló ${when}`, tone: "warning" };
  }
  const label =
    last.status === "queued"
      ? "En camino"
      : REMINDER_STATUS_LABELS[last.status];
  return {
    text: `Avisado ${when} · ${label.toLowerCase()}`,
    tone: "muted",
  };
}

/**
 * «hoy», «ayer», «hace 3 días». En DÍAS DEL CALENDARIO local y no en múltiplos
 * de 24 horas: un aviso de anoche a las 23:00 es «ayer» aunque hayan pasado
 * nueve horas, y decir «hoy» de algo que el operador recuerda de ayer le hace
 * dudar de la pantalla.
 */
export function relativeDay(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.round(
    (startOfDay(now).getTime() - startOfDay(then).getTime()) / 86_400_000,
  );
  if (days <= 0) return "hoy";
  if (days === 1) return "ayer";
  return `hace ${String(days)} días`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Los datos de ejemplo de la vista previa: una expedición real de la cartera,
 * no un «Lorem». Un texto se juzga con las cifras dentro.
 */
export const SAMPLE_REMINDER_VARS: Record<ReminderVariable, string> = {
  contact_name: "Laura Gómez",
  order_number: "#42",
  amount: "$ 3.797.500",
  balance: "$ 7.595.000",
  due_date: "16 de octubre",
  installment_seq: "2",
  installments_count: "3",
  payment_methods: "Nequi, Bancolombia",
};

/**
 * Cómo se verá el texto ya rellenado, espejo de `collection_reminder_template`
 * del servidor.
 *
 * Dos conductas que se copian a propósito, porque son las que sorprenden:
 * una variable que el servidor no conoce **se queda literal** (para que se vea
 * el error antes de mandárselo a un cliente), y la limpieza de puntuación tras
 * un hueco vacío — el servidor la hace porque su plantilla de fábrica empieza
 * por «Hola {{contact_name}}, » y un contacto sin nombre dejaba «Hola , hoy
 * vence…».
 */
export function renderReminderPreview(
  body: string,
  vars: Record<string, string> = SAMPLE_REMINDER_VARS,
): string {
  return body
    .replace(/\{\{\s*(\w+)\s*\}\}/g, (literal, name: string) =>
      name in vars ? vars[name] : literal,
    )
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s,;:]+/, "")
    .trim();
}

/**
 * La etapa de un envío MANUAL, espejo de `templateKeyFor` del servidor.
 *
 * El envío manual salta la cadencia —lo decide un humano— pero NO la fecha: dar
 * por mora una cuota que vence la semana que viene le manda al cliente «tienes
 * una cuota pendiente desde el 22 de septiembre» con una fecha que todavía no
 * ha llegado. Se lee como un cobro agresivo y es un error de programa.
 */
export function manualStageOf(
  dueAt: string,
  today: Date = new Date(),
): ReminderTemplateKey {
  const due = new Date(`${dueAt}T00:00:00`);
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const days = Math.round((start.getTime() - due.getTime()) / 86_400_000);
  if (days > 0) return "overdue";
  return days === 0 ? "due_today" : "due_soon";
}
