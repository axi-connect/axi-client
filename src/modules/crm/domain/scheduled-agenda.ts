import type { ActivityDTO } from "./activity";
import { addDaysToKey, businessDayKey, fmtTime, todayKey, type DayKey } from "@/core/lib/business-time";

/**
 * «Programados» por secciones (hotfix plantillas, lienzo aprobado 2026-09-29).
 *
 * La agenda por día no decía a quién ni qué: una tarea esperando respuesta
 * aparecía en el día en que VENCE la espera, con la misma frase que las demás
 * del lote. Ahora hay tres preguntas, en este orden:
 *
 * 1. **No llegaron** — la apertura que Meta rechazó; espera a que la reenvíen.
 * 2. **Esperando respuesta** — ya salió: cómo va su entrega y hasta cuándo se
 *    espera, agrupada por el lote que la creó.
 * 3. **Por salir** — lo que el agente va a hacer, por día.
 */
export type AgendaSections = {
  failed: ActivityDTO[];
  waiting: AgendaWaitingGroup[];
  upcoming: { day: DayKey; tasks: ActivityDTO[] }[];
};

export type AgendaWaitingGroup = {
  key: string;
  /** El título del seguimiento, una sola vez para todo el lote. */
  title: string;
  bulk: boolean;
  agentId: string | null;
  templateName: string | null;
  tasks: ActivityDTO[];
};

export function isOpeningNotDelivered(task: ActivityDTO): boolean {
  return (
    task.task_status === "open" &&
    task.last_run_status === "failed" &&
    task.last_run_reason === "opening_rejected"
  );
}

function sentAtOf(task: ActivityDTO): string {
  return task.last_opening?.sent_at ?? task.last_run_at ?? task.due_at ?? task.created_at;
}

export function agendaSections(tasks: readonly ActivityDTO[], tz: string): AgendaSections {
  const failed: ActivityDTO[] = [];
  const waitingByKey = new Map<string, AgendaWaitingGroup>();
  const upcomingByDay = new Map<DayKey, ActivityDTO[]>();

  for (const task of tasks) {
    if (isOpeningNotDelivered(task)) {
      failed.push(task);
      continue;
    }
    if (task.awaiting_reply_until !== null) {
      const key = task.bulk_id ?? `task-${task.id}`;
      const group = waitingByKey.get(key) ?? {
        key,
        title: task.title ?? task.objective ?? "Seguimiento",
        bulk: task.bulk_id !== null,
        agentId: task.assigned_agent_id,
        templateName: task.opening_template?.name ?? null,
        tasks: [],
      };
      group.tasks.push(task);
      waitingByKey.set(key, group);
      continue;
    }
    const when = task.next_run_at ?? task.due_at;
    if (when === null) continue;
    const day = businessDayKey(when, tz);
    upcomingByDay.set(day, [...(upcomingByDay.get(day) ?? []), task]);
  }

  const bySent = (a: ActivityDTO, b: ActivityDTO) => sentAtOf(a).localeCompare(sentAtOf(b));
  return {
    failed: failed.sort(bySent),
    waiting: [...waitingByKey.values()].map((group) => ({ ...group, tasks: group.tasks.sort(bySent) })),
    upcoming: [...upcomingByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayTasks]) => ({ day, tasks: dayTasks })),
  };
}

/** «hoy 4:05 p. m.», «mañana 9:00 a. m.», «ayer 4:05 p. m.» o «jue 1 oct · 4:05 p. m.». */
export function whenLabel(iso: string, now: Date, tz: string): string {
  const day = businessDayKey(iso, tz);
  const today = todayKey(now, tz);
  const time = fmtTime(iso, tz);
  if (day === today) return `hoy ${time}`;
  if (day === addDaysToKey(today, 1)) return `mañana ${time}`;
  if (day === addDaysToKey(today, -1)) return `ayer ${time}`;
  return `${shortDay(day)} · ${time}`;
}

function shortDay(day: DayKey): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .replace(/\./g, "");
}

/** Cómo va la entrega de la apertura, en palabras y con su hora. */
export function openingDeliveryLabel(task: ActivityDTO, now: Date, tz: string): { text: string; read: boolean } {
  const opening = task.last_opening;
  const at = opening?.delivery_updated_at ?? opening?.sent_at ?? null;
  const suffix = at === null ? "" : ` · ${fmtTime(at, tz)}`;
  if (opening?.delivery_status === "read") return { text: `Leída${suffix}`, read: true };
  if (opening?.delivery_status === "delivered") return { text: `Entregada${suffix}`, read: false };
  const sent = opening?.sent_at ?? null;
  return { text: sent === null ? "Enviada" : `Enviada · ${whenLabel(sent, now, tz)}`, read: false };
}

/** El motivo del servidor viene como frase («el número no pudo…»): se capitaliza para ir solo. */
export function failureSentence(task: ActivityDTO): string {
  const detail = task.last_opening?.failed_detail ?? null;
  if (detail === null || detail.length === 0) return "Meta rechazó la plantilla de apertura.";
  const sentence = detail.charAt(0).toUpperCase() + detail.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}
