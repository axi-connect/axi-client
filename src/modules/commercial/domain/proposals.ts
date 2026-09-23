import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialApprovalResultDTO, CommercialProposalDTO } from "./commercial";
import { CRM_AI_MISSING_FAILED } from "./copy";

/**
 * Las acciones que Axi propone, dichas como las lee el dueño — módulo PURO.
 *
 * La forma de los artefactos es abierta en el contrato (`unknown[]`), así que
 * aquí se lee a la defensiva: un artefacto con forma inesperada se descarta y
 * la hoja se abre igual (misma regla que `readArtifacts` de cmo).
 */

/** De dónde sale la URL del detalle: una sola, para /comercial y para /cmo. */
export function commercialProposalHref(id: string): string {
  return `/comercial/acciones/${encodeURIComponent(id)}`;
}

/** Las propuestas del método comercial se deciden en /comercial, no en /cmo. */
export function isCommercialProposal(proposal: { source: string }): boolean {
  return proposal.source === "commercial";
}

/**
 * Los motivos de rechazo del mockup (vista 14). Van escritos como criterio,
 * no como queja: el servidor los guarda en `reject_reason` y la señal semanal
 * impide que la misma propuesta vuelva esa semana.
 */
export const REJECT_REASONS = [
  "Prefiero que mi equipo los contacte uno por uno.",
  "Es pronto para volver a escribirles.",
  "No quiero mover precio este mes.",
] as const;

/** El DTO exige 8 caracteres si viaja motivo (`rejectProposalSchema`). */
export const MIN_REJECT_REASON = 8;

/**
 * El titular de la tarjeta y del detalle: «+2 ventas estimadas · cubre el 20 %
 * de lo que falta para volver al ritmo», con la cuenta («12 × 50 % × 35 % = 2»)
 * en la línea secundaria.
 *
 * `covers_pct` mide el ATRASO en ventas (esperadas a hoy − reales), no lo que
 * falta para la meta entera: la frase lo dice («para volver al ritmo») para no
 * prometer más de lo que la cuenta del servidor mide. Sin cifras del método
 * (una propuesta antigua) o con cero ventas estimadas, se pinta el texto del
 * servidor tal cual.
 */
export function proposalHeadline(proposal: Pick<CommercialProposalDTO, "headline" | "estimated_sales" | "covers_pct" | "basis">): {
  primary: string | null;
  basis: string | null;
} {
  const { estimated_sales: estimated, covers_pct: covers } = proposal;
  if (estimated === null || estimated <= 0) return { primary: proposal.headline, basis: proposal.basis };
  const sales = estimated === 1 ? "+1 venta estimada" : `+${formatInteger(estimated)} ventas estimadas`;
  const cover = covers === null ? "" : ` · cubre el ${String(Math.min(100, Math.max(0, covers)))} % de lo que falta para volver al ritmo`;
  return { primary: `${sales}${cover}`, basis: proposal.basis };
}

export type OutreachType = "agent_task_bulk_spec" | "sequence_enrollment_spec";
export type OutreachChannel = "message" | "call" | "call_then_message";

/** Lo que una acción va a hacer al aprobarse, leído de su artefacto. */
export interface OutreachPlan {
  type: OutreachType;
  label: string;
  contacts: number;
  channel: OutreachChannel | null;
  perHour: number | null;
  /** Cuándo arranca: `created_at` + `starts_at_offset_hours` (la regla del servidor). */
  startsAt: Date | null;
  objective: string | null;
  /** `null` = el agente activo por defecto del tenant. */
  agentId: string | null;
}

/**
 * Espejo de dos entradas de `ARTIFACT_LABELS` de cmo (`cmo/domain/proposal-labels.ts`).
 * No se importa: `cmo` ya consume `commercial/public` (la tarjeta enlaza aquí y
 * el briefing pinta el chip) y un barrel de cmo para esto cerraría un ciclo
 * entre los dos slices. Si cambia una, cambia la otra.
 */
export const OUTREACH_TYPE_LABELS: Record<OutreachType, string> = {
  agent_task_bulk_spec: "Lote de seguimiento",
  sequence_enrollment_spec: "Secuencia",
};

/**
 * Dónde se ve lo que encendió una acción aprobada (el pie del detalle y la
 * fila «Contactos» de lo aprobado). `commercial` no importa de `crm`: href.
 */
export const OUTREACH_DESTINATIONS: Record<OutreachType, { href: string; label: string }> = {
  agent_task_bulk_spec: { href: "/crm/tasks", label: "Ver en Tareas" },
  sequence_enrollment_spec: { href: "/crm/settings/sequences", label: "Ver en Secuencias" },
};

export const OUTREACH_CHANNEL_LABELS: Record<OutreachChannel, string> = {
  message: "Mensaje por el canal del contacto",
  call: "Llamada",
  call_then_message: "Llamada y, si no contesta, mensaje",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function readChannel(value: unknown): OutreachChannel | null {
  return value === "message" || value === "call" || value === "call_then_message" ? value : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Los artefactos de salida (lote de tareas del agente, inscripción en
 * secuencia) con lo que la hoja necesita decir en «Qué va a pasar». El
 * arranque se calcula como el servidor: desde la CREACIÓN de la propuesta, no
 * desde el clic (`approve_proposal.use_case.ts`, `applyBulk`).
 */
export function readOutreach(artifacts: readonly unknown[], createdAtIso: string): OutreachPlan[] {
  const created = new Date(createdAtIso);
  return artifacts.flatMap((item): OutreachPlan[] => {
    if (!isRecord(item)) return [];
    const type = item.type;
    if (type !== "agent_task_bulk_spec" && type !== "sequence_enrollment_spec") return [];
    const spec = isRecord(item.spec) ? item.spec : {};
    const ids = Array.isArray(spec.contact_ids) ? spec.contact_ids.filter((id) => typeof id === "string" && id !== "") : [];
    const offset = finite(spec.starts_at_offset_hours);
    const startsAt =
      type === "agent_task_bulk_spec" && !Number.isNaN(created.getTime())
        ? new Date(created.getTime() + Math.max(0, offset ?? 0) * 3_600_000)
        : null;
    return [
      {
        type,
        label: typeof item.label === "string" && item.label !== "" ? item.label : OUTREACH_TYPE_LABELS[type],
        contacts: ids.length,
        channel: readChannel(spec.task_channel),
        perHour: finite(spec.per_hour),
        startsAt,
        objective: typeof spec.objective === "string" && spec.objective !== "" ? spec.objective : null,
        agentId: typeof spec.agent_id === "string" ? spec.agent_id : null,
      },
    ];
  });
}

/** «9:00» · «14:30». */
function clock(date: Date): string {
  return `${String(date.getHours())}:${String(date.getMinutes()).padStart(2, "0")}`;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;

/**
 * Cuándo arranca, en palabras: «hoy a las 9:00», «mañana a las 9:00», «el
 * lunes 28 a las 9:00». Si la hora ya pasó el servidor arranca en el acto:
 * «desde ahora». Días de calendario LOCAL, no horas partidas por 24.
 */
export function startPhrase(startsAt: Date, now: Date = new Date()): string {
  if (startsAt.getTime() <= now.getTime()) return "desde ahora";
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((day(startsAt) - day(now)) / 86_400_000);
  if (days === 0) return `hoy a las ${clock(startsAt)}`;
  if (days === 1) return `mañana a las ${clock(startsAt)}`;
  return startDatePhrase(startsAt);
}

/**
 * El arranque de una acción YA aprobada, en fecha y no en relativo: «el lunes
 * 28 a las 9:00». `startPhrase` diría «desde ahora» de algo que pasó (C6).
 */
export function startDatePhrase(startsAt: Date): string {
  return `el ${WEEKDAYS[startsAt.getDay()]} ${String(startsAt.getDate())} a las ${clock(startsAt)}`;
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

/**
 * Una aprobada de la que esta sesión no guarda el resultado (el servidor no
 * lo persiste: aprobar es de una vez), dicha en PASADO: «Se aprobó el 22 de
 * septiembre». Sin fecha legible, «Se aprobó».
 */
export function approvedOnPhrase(decidedAt: string | null): string {
  if (decidedAt === null) return "Se aprobó";
  const date = new Date(decidedAt);
  if (Number.isNaN(date.getTime())) return "Se aprobó";
  return `Se aprobó el ${String(date.getDate())} de ${MONTHS[date.getMonth()]}`;
}

/**
 * El parcial del servidor («10 programados · 2 omitidos: 1 baja comercial, 1
 * ya tenía una tarea abierta») en partes. Es prosa del servidor: si no tiene
 * la forma esperada devuelve `null` y la pantalla pinta el texto tal cual.
 */
export function readOutreachDetail(detail: string | undefined): { created: number; skipped: number; reasons: string | null } | null {
  if (detail === undefined) return null;
  const match = /^(\d+) (?:programados|inscritos)(?: · (\d+) omitidos: (.+))?$/.exec(detail.trim());
  if (match === null) return null;
  return { created: Number(match[1]), skipped: match[2] === undefined ? 0 : Number(match[2]), reasons: match[3] ?? null };
}

export interface ApprovalLine {
  tone: "ok" | "warn";
  title: string;
  detail: string | null;
}

/**
 * Qué quedó al aprobar, en la voz del mockup (vista 15): «Listo. 36 contactos
 * entran en seguimiento mañana a las 9:00.» y «2 quedaron fuera (2 baja
 * comercial).». Lo aplicado y lo fallido por separado: casi nunca es todo o nada.
 */
export function approvalLines(result: CommercialApprovalResultDTO, plans: readonly OutreachPlan[], now: Date = new Date()): ApprovalLine[] {
  const applied = result.applied.map((item): ApprovalLine => {
    const parsed = readOutreachDetail(item.detail);
    if (parsed === null) {
      return { tone: "ok", title: `Listo. ${item.label}.`, detail: item.detail ?? null };
    }
    const who = parsed.created === 1 ? "1 contacto entra" : `${formatInteger(parsed.created)} contactos entran`;
    const plan = plans.find((candidate) => candidate.type === item.type);
    const when = plan?.startsAt != null ? ` ${startPhrase(plan.startsAt, now)}` : "";
    const title = item.type === "sequence_enrollment_spec" ? `Listo. ${who} en la secuencia.` : `Listo. ${who} en seguimiento${when}.`;
    const out =
      parsed.skipped === 0
        ? null
        : `${parsed.skipped === 1 ? "1 quedó fuera" : `${formatInteger(parsed.skipped)} quedaron fuera`}${parsed.reasons === null ? "" : ` (${parsed.reasons})`}.`;
    return { tone: "ok", title, detail: out };
  });
  const failed = result.failed.map(
    (item): ApprovalLine => ({
      tone: "warn",
      title: `No se pudo: ${item.label}.`,
      detail: isCrmAiMissing(item.reason) ? CRM_AI_MISSING_FAILED : item.reason,
    }),
  );
  return [...applied, ...failed];
}

/** Cuánto queda para decidir: el vencimiento en palabras de calendario local. */
export function expiryPhrase(expiresAt: string | null, now: Date = new Date()): string | null {
  if (expiresAt === null) return null;
  const target = new Date(expiresAt);
  if (Number.isNaN(target.getTime())) return null;
  if (target.getTime() <= now.getTime()) return "Venció";
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((day(target) - day(now)) / 86_400_000);
  if (days <= 0) return "Vence hoy";
  if (days === 1) return "Vence mañana";
  if (days < 7) return `Vence el ${WEEKDAYS[target.getDay()]}`;
  return `Vence en ${String(days)} días`;
}

/** Las propuestas decididas que se siguen enseñando: aprobadas dentro del mes de la meta. */
export function approvedThisPeriod(
  proposals: readonly CommercialProposalDTO[],
  periodStart: string | null,
  limit = 3,
): CommercialProposalDTO[] {
  return proposals
    .filter((proposal) => proposal.status === "approved" && (periodStart === null || (proposal.decided_at ?? "") >= periodStart))
    .slice(0, limit);
}

/** El servidor rechaza el artefacto con `entitlements/capability_not_granted`
 * y un mensaje que nombra `crm_ai` (OutreachActionsService). */
function isCrmAiMissing(reason: string): boolean {
  return /crm_ai/.test(reason);
}
