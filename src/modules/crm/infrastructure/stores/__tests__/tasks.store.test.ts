import type { ActivityDTO, TaskStatsDTO } from "@/modules/crm/domain/activity";
import {
  getTaskStats,
  listTasks,
  runAgentTaskNow,
} from "@/modules/crm/infrastructure/services/activities-service.adapter";
import { useTasksStore } from "../tasks.store";

jest.mock("@/modules/crm/infrastructure/services/activities-service.adapter");

const mockedList = listTasks as jest.MockedFunction<typeof listTasks>;
const mockedStats = getTaskStats as jest.MockedFunction<typeof getTaskStats>;
const mockedRunNow = runAgentTaskNow as jest.MockedFunction<typeof runAgentTaskNow>;

const STATS: TaskStatsDTO = {
  open: 3,
  overdue: 1,
  due_today: 2,
  unassigned: 0,
  agent: { open: 4, deferred: 2, failed: 1 },
};

function page(items: ActivityDTO[] = []) {
  return { data: items, meta: { total: items.length, page: 1, page_size: 25 } } as Awaited<
    ReturnType<typeof listTasks>
  >;
}

describe("tasks.store — dimensión de ejecutor (T2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue(page());
    mockedStats.mockResolvedValue(STATS);
    useTasksStore.setState({
      items: [],
      total: 0,
      page: 1,
      tab: "me",
      due: null,
      status: "open",
      executor: null,
      runStatus: null,
    });
  });

  it("por defecto la bandeja es MEZCLADA: no manda assignee_type", async () => {
    // La promesa del módulo es una sola bandeja; separar por defecto
    // convertiría las tareas de agente en un rincón que nadie visita.
    await useTasksStore.getState().fetch();

    expect(mockedList.mock.calls[0]?.[0]?.assignee_type).toBeUndefined();
  });

  it("en modo agente NO viaja `assignee`, que habla de personas", async () => {
    // `assignee=me` + `assignee_type=agent` pediría tareas de IA asignadas a un
    // usuario: un conjunto que por el CHECK de la migración está siempre vacío.
    useTasksStore.setState({ tab: "me" });
    useTasksStore.getState().setExecutor("agent");
    await Promise.resolve();

    const params = mockedList.mock.calls.at(-1)?.[0];
    expect(params?.assignee_type).toBe("agent");
    expect(params?.assignee).toBeUndefined();
  });

  it("salir del modo agente limpia el filtro de desenlace", async () => {
    useTasksStore.setState({ executor: "agent", runStatus: "deferred" });

    useTasksStore.getState().setExecutor(null);
    await Promise.resolve();

    expect(useTasksStore.getState().runStatus).toBeNull();
    expect(mockedList.mock.calls.at(-1)?.[0]?.last_run_status).toBeUndefined();
  });

  it("el filtro de desenlace viaja como last_run_status y resetea la página", async () => {
    useTasksStore.setState({ executor: "agent", page: 4 });

    useTasksStore.getState().setRunStatus("failed");
    await Promise.resolve();

    expect(useTasksStore.getState().page).toBe(1);
    expect(mockedList.mock.calls.at(-1)?.[0]?.last_run_status).toBe("failed");
  });
});

describe("tasks.store — runNow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedList.mockResolvedValue(page());
    mockedStats.mockResolvedValue(STATS);
  });

  it("no pinta un estado optimista: 202 es encolada, no enviada", async () => {
    mockedRunNow.mockResolvedValue(undefined);
    const task = { id: "task-1", last_run_status: null } as ActivityDTO;
    useTasksStore.setState({ items: [task] });

    const result = await useTasksStore.getState().runNow("task-1");

    expect(result).toEqual({ ok: true });
    expect(mockedRunNow).toHaveBeenCalledWith("task-1");
    // Refresca desde el servidor en vez de inventar "Enviando".
    expect(mockedList).toHaveBeenCalled();
  });

  it("un fallo devuelve mensaje y deja la lista intacta", async () => {
    mockedRunNow.mockRejectedValue(new Error("boom"));
    const task = { id: "task-1" } as ActivityDTO;
    useTasksStore.setState({ items: [task] });

    const result = await useTasksStore.getState().runNow("task-1");

    expect(result.ok).toBe(false);
    expect(useTasksStore.getState().items).toEqual([task]);
  });
});
