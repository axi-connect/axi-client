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
import {
  cancelTask,
  completeTask,
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

  setTab: (tab: TasksTab) => void;
  setDue: (due: TaskDueFilter | null) => void;
  setStatus: (status: TaskStatus | null) => void;
  setExecutor: (executor: TasksExecutor) => void;
  setRunStatus: (status: TaskRunStatus | null) => void;
  setPage: (page: number) => void;
  fetch: () => Promise<void>;
  fetchStats: () => Promise<void>;

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

  setTab: (tab) => {
    set({ tab, page: 1 });
    void get().fetch();
  },

  setDue: (due) => {
    set({ due, page: 1 });
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
    set({ executor, runStatus: executor === "agent" ? get().runStatus : null, page: 1 });
    void get().fetch();
  },

  setRunStatus: (runStatus) => {
    set({ runStatus, page: 1 });
    void get().fetch();
  },

  setPage: (page) => {
    set({ page });
    void get().fetch();
  },

  fetch: async () => {
    const { tab, due, status, executor, runStatus, page } = get();
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
        page,
        page_size: PAGE_SIZE,
      };
      const res = await listTasks(params);
      set({ items: res.data, total: res.meta.total, loading: false });
    } catch (err) {
      set({ loading: false, error: errorMessage(err, "No se pudieron cargar las tareas") });
    }
  },

  fetchStats: async () => {
    try {
      set({ stats: await getTaskStats() });
    } catch {
      // Chips no críticos: la bandeja funciona sin ellos.
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
    if (evt.status !== "running") void get().fetchStats();
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
