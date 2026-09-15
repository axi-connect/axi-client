import { create } from "zustand";
import { errorMessage } from "@/core/lib/error-messages";
import type {
  CrmActivityCreatedEvent,
  CrmAgentTaskRunEvent,
  CrmTaskCompletedEvent,
} from "@/core/realtime/events";
import type {
  ActivityDTO,
  ListTasksParams,
  TaskAssigneeFilter,
  TaskDueFilter,
  TaskStatsDTO,
  TaskStatus,
} from "@/modules/crm/domain/activity";
import type { TaskRunStatus } from "@/modules/crm/domain/task-execution";
import type { AgentDigestDTO } from "@/modules/crm/domain/activity";
import {
  cancelTask,
  completeTask,
  getAgentDigest,
  getTaskStats,
  listTasks,
  reopenTask,
  runAgentTaskNow,
} from "@/modules/crm/infrastructure/services/activities-service.adapter";

/**
 * Bandeja de tareas (F4): lista paginada + stats + acciones optimistas con
 * rollback. Los reducers WS refrescan la bandeja cuando el operador o la IA
 * crean/completan tareas en otro lado. OJO: `crm.task_due` NO viaja por WS
 * (solo campanita) — la bandeja se actualiza al navegar, no en vivo.
 */
const PAGE_SIZE = 25;

/**
 * Secuencia de la última petición de lista en vuelo.
 *
 * Vive fuera del store porque no es estado que se pinte. Existe desde que hay
 * buscador: con un rebote de 300 ms sobre una consulta de texto, «zz» puede
 * aterrizar DESPUÉS de «zzz» y dejar la bandeja mostrando el resultado de una
 * búsqueda que el operador ya descartó.
 */
let listSeq = 0;

export type TaskAction = "complete" | "reopen" | "cancel";
export type TasksTab = Extract<TaskAssigneeFilter, "me" | "unassigned"> | "all";

/**
 * Quién ejecuta. `null` es **mezclado** y es el default deliberado: la promesa
 * del módulo es UNA bandeja con todo el trabajo pendiente, del equipo y de la
 * IA. Separarlas por defecto convertiría las tareas de agente en un rincón que
 * nadie visita.
 */
export type TasksExecutor = "user" | "agent" | null;

type ActionResult = { ok: true } | { ok: false; message: string };

type TasksStore = {
  items: ActivityDTO[];
  total: number;
  page: number;
  loading: boolean;
  error: string | null;
  stats: TaskStatsDTO | null;

  tab: TasksTab;
  due: TaskDueFilter | null;
  status: TaskStatus | null;
  executor: TasksExecutor;
  runStatus: TaskRunStatus | null;
  /** F2: «Esperando respuesta» — abrieron con plantilla y esperan al cliente.
   *  Es un filtro aparte de `runStatus` porque no es un desenlace de corrida. */
  awaiting: boolean;
  /** Búsqueda APLICADA: el rebote vive en el campo, no aquí. */
  q: string;
  /** Parte diario del agente. `null` = aún no llegó o falló: no se pinta. */
  digest: AgentDigestDTO | null;
  /** F2: Lista o agenda «Programados». */
  view: "list" | "scheduled";
  /** F2: tareas de agente abiertas para la agenda, ordenadas por `next_run_at`. */
  agenda: ActivityDTO[];
  agendaLoading: boolean;

  setTab: (tab: TasksTab) => void;
  setDue: (due: TaskDueFilter | null) => void;
  /** Las fichas del marcador mueven DOS ejes a la vez (asignación y
   *  vencimiento). Con un setter por eje serían dos peticiones, y la
   *  segunda saldría con el estado a medio aplicar. */
  setScope: (scope: { tab: TasksTab; due: TaskDueFilter | null }) => void;
  setStatus: (status: TaskStatus | null) => void;
  setExecutor: (executor: TasksExecutor) => void;
  setRunStatus: (status: TaskRunStatus | null) => void;
  setAwaiting: (awaiting: boolean) => void;
  setQuery: (q: string) => void;
  setView: (view: "list" | "scheduled") => void;
  setPage: (page: number) => void;
  fetch: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchAgenda: () => Promise<void>;
  fetchDigest: () => Promise<void>;

  /** Idempotentes en el backend; aquí optimistas con rollback. */
  act: (id: string, action: TaskAction) => Promise<ActionResult>;

  /** Adelanta una tarea de agente. 202: aceptada, no enviada. */
  runNow: (id: string) => Promise<ActionResult>;

  onActivityCreated: (evt: CrmActivityCreatedEvent) => void;
  onTaskCompleted: (evt: CrmTaskCompletedEvent) => void;
  onAgentRun: (evt: CrmAgentTaskRunEvent) => void;
};

const OPTIMISTIC_STATUS: Record<TaskAction, TaskStatus> = {
  complete: "completed",
  reopen: "open",
  cancel: "cancelled",
};

export const useTasksStore = create<TasksStore>((set, get) => ({
  items: [],
  total: 0,
  page: 1,
  loading: false,
  error: null,
  stats: null,
  tab: "me",
  due: null,
  status: "open",
  executor: null,
  runStatus: null,
  awaiting: false,
  q: "",
  digest: null,
  view: "list",
  agenda: [],
  agendaLoading: false,

  setTab: (tab) => {
    set({ tab, page: 1 });
    void get().fetch();
  },

  setDue: (due) => {
    set({ due, page: 1 });
    void get().fetch();
  },

  setScope: ({ tab, due }) => {
    set({ tab, due, page: 1 });
    void get().fetch();
  },

  setStatus: (status) => {
    set({ status, page: 1 });
    void get().fetch();
  },

  setExecutor: (executor) => {
    // El filtro por desenlace del motor solo existe en el mundo de la IA: al
    // salir de él se limpia, o quedaría filtrando invisible sobre tareas que
    // ni siquiera tienen ejecuciones.
    set({
      executor,
      runStatus: executor === "agent" ? get().runStatus : null,
      awaiting: executor === "agent" ? get().awaiting : false,
      page: 1,
    });
    void get().fetch();
  },

  setRunStatus: (runStatus) => {
    // Excluyentes con «Esperando respuesta»: un solo segmentado los pinta.
    set({ runStatus, awaiting: false, page: 1 });
    void get().fetch();
  },

  setAwaiting: (awaiting) => {
    set({ awaiting, runStatus: awaiting ? null : get().runStatus, page: 1 });
    void get().fetch();
  },

  setQuery: (q) => {
    // El campo comitea por temporizador Y por Enter, y limpiar uno ya vacío no
    // es un cambio: sin esta guarda serían dos peticiones idénticas.
    if (get().q === q) return;
    set({ q, page: 1 });
    void get().fetch();
    // La agenda sale del MISMO endpoint: buscar y saltar a «Programados» sin
    // esto ignoraría la búsqueda en silencio.
    if (get().view === "scheduled") void get().fetchAgenda();
  },

  setView: (view) => {
    set({ view });
    if (view === "scheduled") void get().fetchAgenda();
  },

  setPage: (page) => {
    set({ page });
    void get().fetch();
  },

  fetch: async () => {
    const { tab, due, status, executor, runStatus, awaiting, q, page } = get();
    const seq = ++listSeq;
    set({ loading: true, error: null });
    try {
      const params: ListTasksParams = {
        // `assignee` habla de PERSONAS: mandarlo junto a `assignee_type=agent`
        // pediría tareas de IA asignadas a un usuario, que no existen.
        assignee: executor === "agent" || tab === "all" ? undefined : tab,
        due: due ?? undefined,
        status: status ?? undefined,
        assignee_type: executor ?? undefined,
        last_run_status: runStatus ?? undefined,
        awaiting_reply: awaiting ? true : undefined,
        q: q === "" ? undefined : q,
        page,
        page_size: PAGE_SIZE,
      };
      const res = await listTasks(params);
      // Una consulta más nueva ya está en vuelo: su resultado manda.
      if (seq !== listSeq) return;
      set({ items: res.data, total: res.meta.total, loading: false });
    } catch (err) {
      if (seq !== listSeq) return;
      set({ loading: false, error: errorMessage(err, "No se pudieron cargar las tareas") });
    }
  },

  /**
   * Agenda «Programados» (F2): todo lo que el agente va a hacer, ordenado por
   * `next_run_at`. Una sola página grande: es una agenda, no un listado.
   */
  fetchAgenda: async () => {
    set({ agendaLoading: true });
    try {
      const res = await listTasks({
        assignee_type: "agent",
        status: "open",
        q: get().q === "" ? undefined : get().q,
        page: 1,
        page_size: 100,
      });
      const agenda = [...res.data].sort((a, b) => {
        const left = a.next_run_at ?? a.due_at ?? "";
        const right = b.next_run_at ?? b.due_at ?? "";
        return left.localeCompare(right);
      });
      set({ agenda, agendaLoading: false });
    } catch {
      set({ agendaLoading: false });
    }
  },

  fetchStats: async () => {
    try {
      // Con `q`, el marcador cuenta lo BUSCADO: es el filtro principal de la
      // vista y no puede decir «14 abiertas» mientras la lista enseña dos.
      const q = get().q;
      set({ stats: await getTaskStats(q === "" ? undefined : q) });
    } catch {
      // Marcador no crítico: la bandeja funciona sin él.
    }
  },

  fetchDigest: async () => {
    try {
      set({ digest: await getAgentDigest() });
    } catch {
      // Silencioso como el marcador —la bandeja funciona sin la línea— pero
      // por otro motivo: el marcador es redundante con la lista y esto no lo
      // es. Por eso `digest` se queda en `null` y NO se marca «ya intentado»:
      // la siguiente corrida del motor vuelve a pedirlo y se cura solo.
    }
  },

  act: async (id, action) => {
    const before = get().items;
    const task = before.find((item) => item.id === id);
    if (task === undefined) return { ok: false, message: "La tarea ya no existe" };

    set({
      items: before.map((item) =>
        item.id === id ? { ...item, task_status: OPTIMISTIC_STATUS[action] } : item,
      ),
    });

    try {
      const fresh =
        action === "complete"
          ? await completeTask(id)
          : action === "reopen"
            ? await reopenTask(id)
            : await cancelTask(id);
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? fresh : item)),
      }));
      void get().fetchStats();
      return { ok: true };
    } catch (err) {
      set({ items: before });
      return { ok: false, message: errorMessage(err, "No se pudo actualizar la tarea") };
    }
  },

  runNow: async (id) => {
    try {
      await runAgentTaskNow(id);
      // Sin optimismo: 202 significa encolada, no «Enviando». Pintar el
      // spinner aquí prometería un estado que el motor todavía no alcanzó.
      await get().fetch();
      return { ok: true };
    } catch (err) {
      return { ok: false, message: errorMessage(err, "No se pudo ejecutar la tarea") };
    }
  },

  onActivityCreated: (evt) => {
    if (evt.kind !== "task") return;
    void get().fetch();
    void get().fetchStats();
  },

  /**
   * Ejecución del motor: parchea la fila en sitio, sin refetch.
   *
   * Una tarea de agente puede cambiar de estado varias veces en pocos segundos
   * (running → deferred → running); recargar la lista en cada una desplazaría
   * la bandeja bajo el cursor del operador. Solo se toca la fila si YA está en
   * pantalla: una tarea que el filtro actual no muestra no debe aparecer por un
   * evento — eso rompería el filtro que el usuario eligió.
   */
  onAgentRun: (evt) => {
    set((state) => {
      if (!state.items.some((item) => item.id === evt.activity_id)) return state;
      return {
        items: state.items.map((item) =>
          item.id === evt.activity_id
            ? {
                ...item,
                last_run_status: evt.status,
                last_run_reason: evt.reason,
                attempt_count: evt.attempt,
              }
            : item,
        ),
      };
    });
    // Los chips sí se recalculan: son un agregado del tenant, no de la lista.
    if (evt.status !== "running") {
      void get().fetchStats();
      // Una corrida que termina mueve `reached`, `replied` y `failed`.
      void get().fetchDigest();
      if (get().view === "scheduled") void get().fetchAgenda();
    }
  },

  onTaskCompleted: (evt) => {
    // Dedupe seguro: si la completó este cliente, la fila ya está fresca.
    set((state) => ({
      items: state.items.map((item) =>
        item.id === evt.activity_id ? { ...item, task_status: "completed" } : item,
      ),
    }));
    void get().fetchStats();
  },
}));

export const TASKS_PAGE_SIZE = PAGE_SIZE;
