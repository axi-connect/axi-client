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
import { ROUTE_SKIP_REASON_LABELS } from "@/core/lib/route-skip-reasons";
import type { Schemas } from "@/core/api/types";

export type CollectionsPolicyDTO = Schemas["CollectionsPolicyDto"];
/** Lo que devuelve `GET /collections/settings`: la política y, de solo lectura, las variables. */
export type CollectionsSettingsDTO = Schemas["CollectionsSettingsDto"];
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
 * Cómo se llama cada variable en español.
 *
 * Solo las ETIQUETAS se declaran aquí. **La lista la manda el servidor**, por
 * `available_variables` del endpoint de ajustes: un espejo copiado a mano se
 * desincroniza en las dos direcciones y las dos hacen daño — si el servidor
 * añade una, esta pantalla bloquea una plantilla perfectamente válida; si quita
 * una, deja guardar un texto que llega con `{{lo_que_sea}}` literal al WhatsApp
 * de un cliente, que es justo el fallo que el espejo pretendía evitar. Y el
 * candado que lo habría amarrado no se podía escribir desde este lado: el
 * cliente no puede leer la lista del servidor.
 *
 * Una variable nueva que el servidor ofrezca y aquí no tenga nombre se muestra
 * con su código crudo, no se esconde: ver `{{cupo_restante}}` es feo, no
 * poder usarla es un fallo.
 */
export const REMINDER_VARIABLE_LABELS: Record<string, string> = {
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

/**
 * Las variables escritas en un texto que el servidor NO sabe rellenar.
 *
 * `available` viene del contrato, nunca de una constante local: es el único
 * modo de que esta comprobación siga siendo cierta cuando el servidor cambie.
 */
export function unknownReminderVariables(
  body: string,
  available: readonly string[],
): string[] {
  // Patrón ANCHO a propósito: «{{cliente.mascota}}» también es un hueco que el
  // dueño creyó escribir bien, y con `\w+` no se detectaba (QA real de F5).
  const known = new Set<string>(available);
  const bad: string[] = [];
  for (const match of body.matchAll(/\{\{\s*([^{}]*?)\s*\}\}/g)) {
    const name = match[1] ?? "";
    if (!known.has(name) && !bad.includes(name)) bad.push(name);
  }
  return bad;
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
  // Las razones de RUTA (sin canal, desconectado…) son las mismas que en la
  // entrega de documentos: un solo mapa en core, para que «no_channel» no
  // salga en crudo aquí y traducido allá.
  ...ROUTE_SKIP_REASON_LABELS,
  feature_disabled: "La cobranza está apagada en este negocio",
  plan_not_active: "El plan ya no está activo",
  installment_not_found: "La cuota ya no existe",
  installment_paid: "La cuota ya estaba pagada",
  promise_active: "El cliente prometió pagar",
  order_not_found: "El pedido ya no existe",
  stage_not_due: "Ese día ya no tocaba ese aviso",
  template_disabled: "El texto está apagado",
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
export const SAMPLE_REMINDER_VARS: Record<string, string> = {
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

/** La cuota del ejemplo vence el día de `SAMPLE_REMINDER_VARS.due_date`. */
export const SAMPLE_DUE_DATE = "2026-10-16";

export interface ReminderThreadEntry {
  /** Único en el hilo: la dirección y el desfase, como la clave del servidor. */
  id: string;
  template: ReminderTemplateKey;
  /** «vie 9 oct · 7 días antes». */
  when: string;
  /**
   * Por qué ese día no sale el texto: `disabled` (el aviso está apagado) o
   * `no_hsm` (mora sin plantilla aprobada: fuera de las 24 h no sale).
   */
  gap: "disabled" | "no_hsm" | null;
}

const SHORT_DAY = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + offset);
  return SHORT_DAY.format(date).replace(/\./g, "").replace(/,/g, "");
}

/**
 * La cadencia contada como conversación (Cobros premium P5): un mensaje por
 * desfase, en el orden en que llegarían para una cuota de ejemplo. Antes de
 * vencer usa el texto «antes de vencer», el desfase 0 el del día, y la mora el
 * de mora — la misma elección de plantilla que hace el servidor. Un texto
 * apagado no desaparece: deja un hueco ese día.
 */
export function reminderThread(
  policy: Pick<
    CollectionsPolicyDTO,
    | "reminder_days_before"
    | "overdue_reminder_days"
    | "templates"
    | "hsm_templates"
  >,
  dueDate: string = SAMPLE_DUE_DATE,
): { entries: ReminderThreadEntry[]; maxMessages: number } {
  const before = [...new Set(policy.reminder_days_before)].sort(
    (a, b) => b - a,
  );
  const after = [...new Set(policy.overdue_reminder_days)].sort(
    (a, b) => a - b,
  );
  const entry = (
    id: string,
    template: ReminderTemplateKey,
    offset: number,
    note: string,
  ): ReminderThreadEntry => {
    const enabled = policy.templates[template].enabled;
    return {
      id,
      template,
      when: `${shiftDay(dueDate, offset)} · ${note}`,
      gap: !enabled
        ? "disabled"
        : template === "overdue" && policy.hsm_templates.overdue === undefined
          ? "no_hsm"
          : null,
    };
  };
  const entries = [
    ...before.map((days) =>
      days === 0
        ? entry("due_today", "due_today", 0, "el día que vence")
        : entry(
            `due_soon_${String(days)}`,
            "due_soon",
            -days,
            days === 1 ? "1 día antes" : `${String(days)} días antes`,
          ),
    ),
    ...after.map((days) =>
      entry(
        `overdue_${String(days)}`,
        "overdue",
        days,
        days === 1 ? "1 día de mora" : `${String(days)} días de mora`,
      ),
    ),
  ];
  // «Como mucho»: la mora sin plantilla PUEDE salir si la ventana está abierta.
  return {
    entries,
    maxMessages: entries.filter((one) => one.gap !== "disabled").length,
  };
}

/**
 * El texto rellenado partido en trozos, con las variables que el servidor no
 * sabe rellenar aparte: la vista previa las marca en vez de esconderlas.
 */
export function previewSegments(
  body: string,
  known: readonly string[],
): { text: string; unknown: boolean }[] {
  return renderReminderPreview(body)
    .split(/(\{\{\s*\w+\s*\}\})/)
    .filter((part) => part !== "")
    .map((part) => {
      const name = /^\{\{\s*(\w+)\s*\}\}$/.exec(part)?.[1];
      return {
        text: part,
        unknown: name !== undefined && !known.includes(name),
      };
    });
}
