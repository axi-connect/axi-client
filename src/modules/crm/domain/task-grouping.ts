import {
  addDaysToKey,
  businessDayKey,
  diffDays,
  todayKey,
  type DayKey,
} from "@/modules/scheduling/public";

import { isOverdue, type ActivityDTO } from "./activity";
import { isAgentTask } from "./task-execution";

/**
 * Agrupación de la bandeja por día, en la zona del NEGOCIO.
 *
 * Existe porque una lista plana ordenada por vencimiento no responde a la única
 * pregunta que se le hace a una bandeja —«qué sigue»—: hay que leer catorce
 * fechas relativas para reconstruir un calendario que el servidor ya devuelve
 * ordenado. Aquí se corta en cinco cubos y cada fila pinta solo su hora.
 *
 * TypeScript puro — cero React, cero http.
 */

export type TaskBucket = "overdue" | "today" | "tomorrow" | "week" | "later" | "undated";

export type TaskGroup = {
  bucket: TaskBucket;
  tasks: ActivityDTO[];
};

/** Orden de lectura: lo tarde primero, lo indefinido al final. */
const BUCKET_ORDER: readonly TaskBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "week",
  "later",
  "undated",
];

export const TASK_BUCKET_LABELS: Record<TaskBucket, string> = {
  overdue: "Vencidas",
  today: "Hoy",
  tomorrow: "Mañana",
  week: "Esta semana",
  later: "Más adelante",
  undated: "Sin fecha",
};

/**
 * El instante que la fila MUESTRA, que no siempre es el compromiso.
 *
 * Una tarea de agente abierta se describe por `next_run_at` —cuándo lo va a
 * intentar la IA— y no por `due_at`; con los diferimientos ya no son lo mismo.
 * Agrupar por uno y pintar el otro produciría una fila en «Hoy» con hora de
 * mañana, que es peor que no agrupar.
 */
export function effectiveWhen(
  task: Pick<ActivityDTO, "kind" | "assignee_type" | "task_status" | "due_at" | "next_run_at">,
): string | null {
  if (isAgentTask(task) && task.task_status === "open" && task.next_run_at !== null) {
    return task.next_run_at;
  }
  return task.due_at;
}

/** El cubo de una tarea. `now` se inyecta por testabilidad. */
export function taskBucket(task: ActivityDTO, tz: string, now: Date): TaskBucket {
  const when = effectiveWhen(task);
  if (when === null) return "undated";
  // `isOverdue` ya sabe que una tarea de agente en espera NO está vencida: el
  // rojo significa «alguien no hizo algo», y un diferimiento es el motor
  // esperando su ventana.
  if (isOverdue(task, now)) return "overdue";

  const today = todayKey(now, tz);
  const days = diffDays(today, businessDayKey(when, tz));
  // Un día ya pasado que `isOverdue` no marca (una recién completada, una de
  // agente en espera) se queda donde el operador la vio: saltar de grupo bajo
  // el cursor al marcarla es peor que un rótulo impreciso durante un refresco.
  if (days <= 0) return days < 0 ? "overdue" : "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

/**
 * Agrupa una página de la bandeja. Devuelve solo los cubos con tareas, en
 * orden de lectura y con cada cubo ordenado por su instante efectivo.
 *
 * OJO: agrupa la PÁGINA, no la consulta. El servidor pagina ordenando por
 * `due_at`, así que en el borde entre dos páginas un cubo puede aparecer en
 * ambas. Es el precio de no pedirle al backend un endpoint de agenda para la
 * lista, y se nota solo a partir de la página 2.
 */
export function groupTasks(tasks: readonly ActivityDTO[], tz: string, now: Date): TaskGroup[] {
  const buckets = new Map<TaskBucket, ActivityDTO[]>();
  for (const task of tasks) {
    const bucket = taskBucket(task, tz, now);
    buckets.set(bucket, [...(buckets.get(bucket) ?? []), task]);
  }
  return BUCKET_ORDER.filter((bucket) => buckets.has(bucket)).map((bucket) => ({
    bucket,
    tasks: [...(buckets.get(bucket) ?? [])].sort(byEffectiveWhen),
  }));
}

function byEffectiveWhen(a: ActivityDTO, b: ActivityDTO): number {
  return (effectiveWhen(a) ?? "").localeCompare(effectiveWhen(b) ?? "");
}

/**
 * Subtítulo del grupo: la fecha larga de «Hoy» y «Mañana», el rango de la
 * semana. Los demás cubos no tienen una fecha única y cada fila lleva la suya.
 */
export function bucketDateLabel(bucket: TaskBucket, tz: string, now: Date): string | null {
  const today = todayKey(now, tz);
  if (bucket === "today") return longDay(today);
  if (bucket === "tomorrow") return longDay(addDaysToKey(today, 1));
  if (bucket === "week") return `${shortDay(addDaysToKey(today, 2))} – ${shortDay(addDaysToKey(today, 7))}`;
  return null;
}

/** «jueves 18 de septiembre» a partir de un DayKey (sin tocar zonas: ya es día de negocio). */
function longDay(key: DayKey): string {
  return format(key, { weekday: "long", day: "numeric", month: "long" });
}

/** «22 sept» — sin el «de» que `es-CO` mete en su patrón: es una etiqueta de
 *  columna, no una frase. */
function shortDay(key: DayKey): string {
  const parts = formatParts(key, { day: "numeric", month: "short" });
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")} ${get("month").replace(".", "")}`;
}

function format(key: DayKey, options: Intl.DateTimeFormatOptions): string {
  return formatParts(key, options)
    .map((part) => part.value)
    .join("");
}

function formatParts(key: DayKey, options: Intl.DateTimeFormatOptions) {
  const [year, month, day] = key.split("-").map(Number);
  // Mediodía UTC + timeZone UTC: el DayKey ya ES el día de negocio, así que
  // reinterpretarlo en otra zona lo correría un día.
  return new Intl.DateTimeFormat("es-CO", { ...options, timeZone: "UTC" }).formatToParts(
    new Date(Date.UTC(year, month - 1, day, 12)),
  );
}

/**
 * Hora de pared del negocio para el canalón, en 24 h.
 *
 * 24 h y no «9:00 a. m.» porque es una columna de alineación: con `tabular-nums`
 * las horas quedan a plomo y ocupan la mitad. El resto de la vista sigue en 12 h.
 */
export function clockLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).format(new Date(iso));
}

/** «mar 16» — solo en los cubos que mezclan días. */
export function dayLabel(iso: string, tz: string, now: Date): string | null {
  const key = businessDayKey(iso, tz);
  const days = diffDays(todayKey(now, tz), key);
  if (days === 0) return null;
  if (days === -1) return "ayer";
  if (days === 1) return "mañana";
  return shortDay(key);
}

/** El cubo mezcla días: sus filas necesitan decir cuál. */
export function bucketMixesDays(bucket: TaskBucket): boolean {
  return bucket === "overdue" || bucket === "week" || bucket === "later";
}

/** Ya pasó su hora y sigue abierta: la fila se atenúa dentro de «Hoy». */
export function isPastSlot(task: ActivityDTO, now: Date): boolean {
  if (task.task_status !== "open") return false;
  const when = effectiveWhen(task);
  if (when === null) return false;
  const at = new Date(when).getTime();
  return Number.isFinite(at) && at < now.getTime();
}
