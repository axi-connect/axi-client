/**
 * «Preparar entrega» (entrega_bienvenida_plan.md, R2 y F4): las reglas de la
 * página, en TypeScript puro para probarlas sin React.
 *
 * - los cuatro pasos (pestañas, no un asistente bloqueante);
 * - la copia al equipo: hasta 10 correos y nunca el del dueño (N1);
 * - la clave de idempotencia: una por intento y estable al reintentar (N3);
 * - los bloqueos y avisos del servidor, agrupados en la barra y en los pasos;
 * - las fechas en la zona del tenant (`datetime-local` ↔ ISO con offset).
 *
 * Los bloqueos llegan como `{ code, message }`: el mensaje es del servidor y
 * se pinta tal cual; aquí solo se decide dónde va cada uno.
 */

import { formatInstantTime, formatWeekdayDate } from "@/modules/welcome-kit/domain/formatters";

// ------------------------------------------------------------------ pasos

export const DELIVERY_STEPS = [
  { id: "offer", label: "Oferta" },
  { id: "trial", label: "Prueba y citas" },
  { id: "mail", label: "Correo" },
  { id: "review", label: "Revisar y enviar" },
] as const;

export type DeliveryStepId = (typeof DELIVERY_STEPS)[number]["id"];

export function isDeliveryStep(value: string): value is DeliveryStepId {
  return DELIVERY_STEPS.some((step) => step.id === value);
}

// ------------------------------------------------------------------ copia al equipo

/** Tope del servidor (`DELIVERY_LIMITS.cc`). */
export const MAX_CC = 10;

// La misma idea que `z.email()`: algo@algo.tld, sin espacios.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_PATTERN.test(value.trim());
}

export type CcRejection = "empty" | "invalid" | "owner" | "duplicate" | "too_many";

export type CcCheck =
  | { ok: true; email: string }
  | { ok: false; reason: CcRejection; message: string };

/**
 * ¿Entra este correo en la copia al equipo? El del dueño nunca: él recibe el
 * suyo, con el enlace de la contraseña, y la copia va sin él (N1).
 */
export function checkCcEmail(
  raw: string,
  context: { ownerEmail: string | null; current: readonly string[] },
): CcCheck {
  const email = normalizeEmail(raw);
  if (email === "") return { ok: false, reason: "empty", message: "Escribe un correo." };
  if (!isEmail(email)) {
    return { ok: false, reason: "invalid", message: `«${raw.trim()}» no parece un correo. Revísalo.` };
  }
  if (context.ownerEmail !== null && email === normalizeEmail(context.ownerEmail)) {
    return {
      ok: false,
      reason: "owner",
      message: "Es el correo del dueño: ya recibe el suyo, con su enlace de acceso.",
    };
  }
  if (context.current.some((existing) => normalizeEmail(existing) === email)) {
    return { ok: false, reason: "duplicate", message: "Ese correo ya está en la copia." };
  }
  if (context.current.length >= MAX_CC) {
    return { ok: false, reason: "too_many", message: `La copia admite hasta ${MAX_CC} correos.` };
  }
  return { ok: true, email };
}

/** Lo que se pega de una lista («a@x.co, b@x.co; c@x.co») se parte en correos. */
export function splitCcInput(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

// ------------------------------------------------------------------ idempotencia

/**
 * La clave de un intento de envío (N3). Se genera la primera vez que se pide y
 * no cambia al reintentar: con la misma clave, el servidor completa lo que
 * faltó sin repetir la invitación ni el reinicio. `adopt` retoma la de una
 * entrega a medias que trae `GET …/delivery`.
 */
export type AttemptKeyHolder = {
  current: () => string;
  adopt: (key: string) => void;
  peek: () => string | null;
};

export function createAttemptKeyHolder(
  generate: () => string = () => crypto.randomUUID(),
): AttemptKeyHolder {
  let key: string | null = null;
  return {
    current() {
      key ??= generate();
      return key;
    },
    adopt(next) {
      key = next;
    },
    peek() {
      return key;
    },
  };
}

type WithStatus = { status: "draft" | "committed" | "mail_queued" | "sent" | "failed" };

/**
 * Una entrega a medias: el servidor anotó pasos pero no llegó a encolar los
 * correos. Se retoma con SU clave, no con una nueva.
 */
export function isResumableDelivery(delivery: WithStatus | null | undefined): boolean {
  return delivery?.status === "draft" || delivery?.status === "committed";
}

/** Ya salió (o salió y falló el correo): la página muestra el resumen y «Reenviar». */
export function isDispatchedDelivery(delivery: WithStatus | null | undefined): boolean {
  return (
    delivery?.status === "mail_queued" || delivery?.status === "sent" || delivery?.status === "failed"
  );
}

// ------------------------------------------------------------------ bloqueos y avisos

export type CheckGroup = "offer" | "trial" | "calls" | "kit" | "mail";

export const CHECK_GROUPS: readonly { id: CheckGroup; label: string; step: DeliveryStepId }[] = [
  { id: "offer", label: "Oferta", step: "offer" },
  { id: "trial", label: "Prueba", step: "trial" },
  { id: "calls", label: "Citas", step: "trial" },
  { id: "mail", label: "Correo", step: "mail" },
  { id: "kit", label: "Datos del kit", step: "review" },
];

const BLOCKER_GROUP: Readonly<Record<string, CheckGroup>> = {
  offer_not_quoted: "offer",
  enterprise: "trial",
  suspended_other: "trial",
  already_paying: "trial",
  trial_shortens: "trial",
  trial_required: "trial",
  calls_missing: "calls",
  calls_out_of_trial: "calls",
  owner_missing: "mail",
  agent_missing: "kit",
  agent_name_too_long: "kit",
  business_name_too_long: "kit",
  payment_methods_missing: "kit",
};

const WARNING_GROUP: Readonly<Record<string, CheckGroup>> = {
  call_on_weekend: "calls",
};

/**
 * Los bloqueos de los datos del tenant no se arreglan en esta página: el
 * enlace lleva a donde se corrigen en la consola. El agente y los medios de
 * pago viven en el panel del tenant, así que esos no llevan enlace.
 */
const BLOCKER_FIX: Readonly<Record<string, { label: string; path: (tenantId: string) => string }>> = {
  business_name_too_long: { label: "Editar el nombre", path: (id) => `/platform/tenants/${id}` },
  owner_missing: { label: "Ver usuarios", path: (id) => `/platform/tenants/${id}/users` },
};

/**
 * Bloqueos que no se arreglan editando, sino confirmando: el reinicio que
 * acorta la prueba vigente pasa si el envío lleva `confirm_trial_shortening`.
 * La página pide la confirmación al enviar, así que no cuentan como bloqueo.
 */
export const CONFIRMABLE_BLOCKERS: ReadonlySet<string> = new Set(["trial_shortens"]);

/** Bloqueos que impiden reiniciar la prueba (el interruptor se apaga). */
export const NO_RESTART_BLOCKERS: ReadonlySet<string> = new Set(["enterprise", "suspended_other", "already_paying"]);

/**
 * Pantalla del panel del tenant donde se resuelve cada bloqueo con
 * `action.kind = 'support'` (H2-5): la pestaña de soporte entra directo ahí.
 */
export const SUPPORT_TARGET_PATHS: Readonly<Record<string, string>> = {
  agent: "/admin/agents",
  payment_methods: "/settings/payments",
  schedule: "/settings/company",
  catalog: "/catalog/products",
  company: "/settings/company",
};

export function supportTargetPath(target: string): string {
  return SUPPORT_TARGET_PATHS[target] ?? "/dashboard";
}

/** El motivo que precarga el diálogo de soporte desde un bloqueo. */
export function supportReasonFor(message: string): string {
  return `Dejar lista la cuenta para la entrega: ${message}`;
}

export type DeliveryIssue = {
  /** `confirm`: bloqueo que se levanta confirmando al enviar (`CONFIRMABLE_BLOCKERS`). */
  kind: "blocker" | "warning" | "confirm";
  code: string;
  message: string;
  group: CheckGroup;
  step: DeliveryStepId;
  /** Campo del formulario al que apunta el aviso (`call_day2_at`), si lo hay. */
  field: string | null;
  fix: { label: string; href: string } | null;
  /** Se resuelve entrando como soporte a esta pantalla del panel (H2-5). */
  support: { target: string; next: string } | null;
};

function stepOf(group: CheckGroup): DeliveryStepId {
  return CHECK_GROUPS.find((item) => item.id === group)?.step ?? "review";
}

export function deliveryIssues(
  tenantId: string,
  blockers: readonly { code: string; message: string; action?: { kind: string; target: string } | null }[],
  warnings: readonly { code: string; message: string; field?: string }[],
): DeliveryIssue[] {
  const out: DeliveryIssue[] = [];
  for (const blocker of blockers) {
    // Un código nuevo del servidor no se pierde: cae en «Datos del kit».
    const group = BLOCKER_GROUP[blocker.code] ?? "kit";
    const fix = BLOCKER_FIX[blocker.code];
    out.push({
      kind: CONFIRMABLE_BLOCKERS.has(blocker.code) ? "confirm" : "blocker",
      code: blocker.code,
      message: blocker.message,
      group,
      step: stepOf(group),
      field: null,
      fix: fix ? { label: fix.label, href: fix.path(tenantId) } : null,
      support:
        blocker.action?.kind === "support"
          ? { target: blocker.action.target, next: supportTargetPath(blocker.action.target) }
          : null,
    });
  }
  for (const warning of warnings) {
    const group = WARNING_GROUP[warning.code] ?? "calls";
    out.push({
      kind: "warning",
      code: warning.code,
      message: warning.message,
      group,
      step: stepOf(group),
      field: warning.field ?? null,
      fix: null,
      support: null,
    });
  }
  return out;
}

export type CheckState = "ok" | "warn" | "blocked";

export type CheckSummary = { id: CheckGroup; label: string; step: DeliveryStepId; state: CheckState };

/** La fila de puntos de la barra inferior: un bloqueo pesa más que un aviso. */
export function summarizeChecks(issues: readonly DeliveryIssue[]): CheckSummary[] {
  return CHECK_GROUPS.map((group) => {
    const mine = issues.filter((issue) => issue.group === group.id);
    const state: CheckState = mine.some((issue) => issue.kind === "blocker")
      ? "blocked"
      : mine.length > 0
        ? "warn"
        : "ok";
    return { ...group, state };
  });
}

/** Pasos con un bloqueo: la pestaña lo marca. */
export function blockedSteps(issues: readonly DeliveryIssue[]): Set<DeliveryStepId> {
  return new Set(issues.filter((issue) => issue.kind === "blocker").map((issue) => issue.step));
}

/** ¿Hay que confirmar algo al enviar? (hoy: que el reinicio acorta la prueba). */
export function needsConfirmation(issues: readonly DeliveryIssue[]): DeliveryIssue | null {
  return issues.find((issue) => issue.kind === "confirm") ?? null;
}

/** El aviso de un campo concreto (el fin de semana del día 2), para pintarlo bajo él. */
export function warningFor(issues: readonly DeliveryIssue[], field: string): string | null {
  return issues.find((issue) => issue.kind === "warning" && issue.field === field)?.message ?? null;
}

/** Los pasos del formulario que tienen un error de validación local. */
const FIELD_STEP: Readonly<Record<string, DeliveryStepId>> = {
  offer: "offer",
  restart_trial: "trial",
  session_date: "trial",
  call_day2_at: "trial",
  call_day5_at: "trial",
  digest_time: "trial",
  advisor: "mail",
  cc: "mail",
};

export function stepOfField(path: string): DeliveryStepId {
  return FIELD_STEP[path.split(".")[0] ?? ""] ?? "review";
}

// ------------------------------------------------------------------ fechas en la zona del tenant

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number };

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Minutos de diferencia de la zona respecto de UTC en ese instante (Bogotá: −300). */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return Math.round((asUtc - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000);
}

/** ISO → `YYYY-MM-DDTHH:mm` en la hora del tenant (lo que pinta un `datetime-local`). */
export function isoToZonedInput(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** ISO → `YYYY-MM-DD` en la zona del tenant. */
export function isoToZonedDate(iso: string, timeZone: string): string {
  return isoToZonedInput(iso, timeZone).slice(0, 10);
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * `YYYY-MM-DDTHH:mm` leído en la hora del tenant → ISO con su offset
 * (`2026-09-28T10:00:00-05:00`), que es lo que pide el servidor. null si no es
 * una fecha válida.
 */
export function zonedInputToIso(local: string, timeZone: string): string | null {
  const match = LOCAL_INPUT.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(wall)) return null;
  // Dos pasadas: el offset del instante estimado y, si cambia (horario de
  // verano), el del instante corregido.
  let offset = offsetMinutes(new Date(wall), timeZone);
  offset = offsetMinutes(new Date(wall - offset * 60_000), timeZone);
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** «sáb 26 sep» en la zona del tenant (formateador es-CO del kit: «sep», nunca «sept»). */
export function formatZonedDay(iso: string, timeZone: string): string {
  return formatWeekdayDate(iso, timeZone);
}

/** «11:59 p. m.» en la zona del tenant. */
export function formatZonedTime(iso: string, timeZone: string): string {
  return formatInstantTime(iso, timeZone);
}

/** «jue 24 sep → jue 1 oct a las 11:59 p. m.» (la prueba que arrancaría hoy). */
export function formatTrialRange(startsAt: string, endsAt: string, timeZone: string): string {
  return `${formatZonedDay(startsAt, timeZone)} → ${formatZonedDay(endsAt, timeZone)} a las ${formatZonedTime(endsAt, timeZone)}`;
}

/** «hora de Bogotá» para `America/Bogota`; el identificador tal cual para las demás. */
export function timeZoneLabel(timeZone: string): string {
  if (timeZone === "America/Bogota") return "hora de Bogotá";
  const city = timeZone.split("/").pop()?.replace(/_/g, " ");
  return city ? `hora de ${city}` : timeZone;
}

/**
 * ¿Reiniciar acorta la prueba? Pasa si la vigente vence DESPUÉS del día 7 del
 * reinicio: entonces se pide confirmarlo antes de enviar.
 */
export function restartShortensTrial(currentEndsAt: string | null, restartEndsAt: string): boolean {
  if (currentEndsAt === null) return false;
  return new Date(currentEndsAt).getTime() > new Date(restartEndsAt).getTime();
}

// ------------------------------------------------------------------ teléfono

/** «+57 300 482 1937» → «+573004821937». */
export function compactPhone(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

// ------------------------------------------------------------------ borrador local

/** El borrador de «Preparar entrega» se guarda en este navegador, por tenant. */
export function deliveryDraftStorageKey(tenantId: string): string {
  return `axi.platform.delivery-draft.${tenantId}`;
}

// ------------------------------------------------------------------ entrega enviada

export type DeliveryStatusValue = WithStatus["status"];

export const DELIVERY_STATUS_LABELS: Readonly<Record<DeliveryStatusValue, string>> = {
  draft: "A medias",
  committed: "Confirmada · preparando el correo",
  mail_queued: "Correo en camino",
  sent: "Entregada",
  failed: "El correo no salió",
};

/**
 * Vida del enlace «Crea tu contraseña» (servidor: `authConfig.invite_ttl_hours`).
 * El contrato de la entrega no expone el vencimiento de la invitación, así que
 * se deriva del último envío al dueño. Si el servidor lo publica, se lee de ahí.
 */
export const INVITE_TTL_HOURS = 72;

type AttemptLike = {
  attempt: number;
  audience: "owner" | "team";
  status: string;
  provider_message_id: string | null;
  sent_at: string | null;
};

/** El intento más reciente del correo del dueño (el que lleva el enlace). */
export function latestOwnerAttempt<T extends AttemptLike>(attempts: readonly T[]): T | null {
  return attempts
    .filter((attempt) => attempt.audience === "owner")
    .reduce<T | null>((latest, attempt) => (latest === null || attempt.attempt > latest.attempt ? attempt : latest), null);
}

/** Cuándo vence el enlace de contraseña vigente, o null si aún no salió ninguno. */
export function inviteExpiresAt(attempts: readonly AttemptLike[]): string | null {
  const owner = latestOwnerAttempt(attempts);
  if (owner?.sent_at == null) return null;
  return new Date(new Date(owner.sent_at).getTime() + INVITE_TTL_HOURS * 3_600_000).toISOString();
}

export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

export type DeliveryRecipient = {
  role: "owner" | "cc";
  /** El correo completo (H3-3); el enmascarado solo si el servidor no lo trae. */
  email: string;
  status: RecipientStatus;
  error: string | null;
};

type RecipientAttempt = {
  attempt: number;
  audience: "owner" | "team";
  /** El correo completo: la consola es de super_admin (H3-3). */
  recipient?: string | null;
  recipient_masked: string;
  status: RecipientStatus;
  error: string | null;
};

/**
 * El estado REAL de cada destinatario (H2-4): el servidor anota un intento por
 * destinatario, así que vale el del último intento de cada audiencia (un
 * reenvío repite a todos). Sin intentos todavía (entrega recién confirmada), el
 * dueño y la copia salen «en cola».
 */
export function deliveryRecipients(
  delivery: { cc: readonly string[]; attempts: readonly RecipientAttempt[] },
  ownerEmail: string | null,
): DeliveryRecipient[] {
  const latest = (audience: "owner" | "team") => {
    const rows = delivery.attempts.filter((attempt) => attempt.audience === audience);
    const last = rows.reduce((max, attempt) => Math.max(max, attempt.attempt), 0);
    return rows.filter((attempt) => attempt.attempt === last);
  };
  const owner = latest("owner");
  const team = latest("team");
  const out: DeliveryRecipient[] = [];
  if (owner.length > 0) {
    for (const row of owner) {
      out.push({ role: "owner", email: row.recipient || row.recipient_masked, status: row.status, error: row.error });
    }
  } else {
    out.push({ role: "owner", email: ownerEmail ?? "El dueño de la cuenta", status: "pending", error: null });
  }
  if (team.length > 0) {
    for (const row of team) {
      out.push({ role: "cc", email: row.recipient || row.recipient_masked, status: row.status, error: row.error });
    }
  } else {
    for (const email of delivery.cc) out.push({ role: "cc", email, status: "pending", error: null });
  }
  return out;
}

/** ¿Algún correo de la copia no salió? (el texto de «enviado» no puede decir que sí). */
export function teamCopyFailed(recipients: readonly DeliveryRecipient[]): boolean {
  return recipients.some((recipient) => recipient.role === "cc" && recipient.status === "failed");
}

/** «re_8f2c…»: el id del proveedor, corto para la ficha (el completo va al copiar). */
export function shortMessageId(id: string): string {
  return id.length <= 10 ? id : `${id.slice(0, 8)}…`;
}

// ------------------------------------------------------------------ vista previa del kit

/**
 * La pestaña «Kit» muestra el kit real en un iframe (`/bienvenida/vista-previa`)
 * para que se vea a su ancho de verdad (escritorio o celular). La página y el
 * iframe son del mismo origen y se hablan por `postMessage`: el iframe avisa
 * que está listo y la página le manda los datos.
 */
export const KIT_PREVIEW_PATH = "/bienvenida/vista-previa";
export const KIT_PREVIEW_READY = "axi:kit-preview-ready";
export const KIT_PREVIEW_DATA = "axi:kit-preview-data";
