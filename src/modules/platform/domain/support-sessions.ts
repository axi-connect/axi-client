/**
 * Acceso de soporte (entrega F3), lado de la consola: el registro de sesiones
 * de un tenant y cómo se leen en su auditoría. TypeScript puro.
 */
import type { Schemas } from "@/core/api/types";

export type SupportSession = Schemas["SupportSessionListDto"]["data"][number];
export type IssueSupportSessionDTO = Schemas["IssueSupportSessionDto"];
export type IssuedSupportSession = Schemas["IssuedSupportSessionDto"];

/** Las reglas del servidor (`support_session.policy.ts`), repetidas para validar antes de enviar. */
export const SUPPORT_MIN_MINUTES = 15;
export const SUPPORT_MAX_MINUTES = 60;
export const SUPPORT_DEFAULT_MINUTES = 60;
export const SUPPORT_REASON_MIN = 20;

/**
 * La pestaña de soporte: el código viaja en el `#`, nunca en la query. `next`
 * es la pantalla del panel a la que entra; `/auth/soporte` la vuelve a filtrar
 * con su lista blanca.
 */
export function supportTabUrl(handoffCode: string, next?: string): string {
  const params = new URLSearchParams({ code: handoffCode });
  if (next) params.set("next", next);
  return `/auth/soporte#${params.toString()}`;
}

/**
 * Antes de emitir una sesión nueva, las abiertas del MISMO admin en este tenant
 * se cierran (QA H3-5: «Configurar como soporte» dejaba cinco abiertas). El
 * servidor no deja reusarlas. Sin id de admin conocido no se cierra nada.
 */
export function sessionsToCloseBeforeIssue(
  sessions: readonly Pick<SupportSession, "id" | "status" | "platform_user">[],
  adminId: string | null,
): string[] {
  if (adminId === null) return [];
  return sessions
    .filter((session) => isOpenSupportSession(session) && session.platform_user?.id === adminId)
    .map((session) => session.id);
}

export const SUPPORT_STATUS_LABELS: Record<SupportSession["status"], string> = {
  pending: "Sin abrir",
  active: "Activa",
  ended: "Terminada",
  revoked: "Cerrada desde la consola",
  expired: "Venció",
};

/** Una sesión que aún se puede cerrar desde la consola. */
export function isOpenSupportSession(session: Pick<SupportSession, "status">): boolean {
  return session.status === "active" || session.status === "pending";
}

/** 2520 → «42 min»; 45 → «1 min»; null → «—». */
export function formatSupportDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

// ─── Auditoría del tenant (D2 y O11) ────────────────────────────────────────

type AuditLogLike = {
  id: string;
  actor_type: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  changes: unknown;
  occurred_at: string;
};

/** Las filas de actividad de soporte, una por request (`support_activity.interceptor`). */
const SUPPORT_ACTIVITY_ACTIONS = new Set(["support.read", "support.write", "support.write_failed"]);

/**
 * D2: en la auditoría de plataforma, lo hecho por un admin se lee «Soporte
 * Axi · {nombre}». El nombre sale del registro de sesiones (el log solo trae el
 * id); sin él, «Soporte Axi». Solo se ve en la consola: el tenant no tiene
 * vista de auditoría.
 */
export function auditActorLabel(
  log: Pick<AuditLogLike, "actor_type" | "actor_user_id">,
  adminNames: ReadonlyMap<string, string>,
): string {
  if (log.actor_type !== "platform_admin") return log.actor_type;
  const name = log.actor_user_id ? adminNames.get(log.actor_user_id) : undefined;
  return name ? `Soporte Axi · ${name}` : "Soporte Axi";
}

/** Nombres de los admins que abrieron sesiones de soporte en el tenant, por id. */
export function adminNamesFrom(sessions: readonly SupportSession[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const session of sessions) {
    if (session.platform_user) map.set(session.platform_user.id, session.platform_user.name);
  }
  return map;
}

export type AuditItem<T extends AuditLogLike> =
  | { kind: "log"; log: T }
  | {
      kind: "support";
      sessionId: string;
      /** El admin de la sesión (actor de sus filas). */
      actorUserId: string | null;
      /** De la más reciente a la más antigua, como el resto de la lista. */
      logs: T[];
      screens: number;
      changes: number;
      failed: number;
      /** La más reciente: la fila del grupo se ordena por ella. */
      occurredAt: string;
    };

/**
 * O11: las filas `support.*` (una por request, lecturas incluidas) inundarían
 * la pestaña. Se agrupan por sesión de soporte en UNA fila, en el lugar de su
 * actividad más reciente: «Sesión de soporte · N pantallas · M cambios». Las
 * filas de dominio hechas en soporte siguen sueltas: son los cambios reales.
 */
export function groupSupportActivity<T extends AuditLogLike>(logs: readonly T[]): AuditItem<T>[] {
  const out: AuditItem<T>[] = [];
  const groups = new Map<string, Extract<AuditItem<T>, { kind: "support" }>>();
  for (const log of logs) {
    const sessionId = SUPPORT_ACTIVITY_ACTIONS.has(log.action) && log.entity_type === "support_session" ? log.entity_id : null;
    if (sessionId === null) {
      out.push({ kind: "log", log });
      continue;
    }
    let group = groups.get(sessionId);
    if (!group) {
      group = {
        kind: "support",
        sessionId,
        actorUserId: log.actor_user_id,
        logs: [],
        screens: 0,
        changes: 0,
        failed: 0,
        occurredAt: log.occurred_at,
      };
      groups.set(sessionId, group);
      out.push(group);
    }
    group.logs.push(log);
    if (log.action === "support.read") group.screens += 1;
    else if (log.action === "support.write") group.changes += 1;
    else group.failed += 1;
    if (log.occurred_at > group.occurredAt) group.occurredAt = log.occurred_at;
  }
  return out;
}
