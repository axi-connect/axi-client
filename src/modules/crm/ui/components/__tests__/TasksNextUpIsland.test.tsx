import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ActivityDTO, TaskStatsDTO } from "@/modules/crm/domain/activity";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";
import { TasksNextUpIsland } from "../TasksNextUpIsland";

jest.mock("@/modules/crm/infrastructure/services/activities-service.adapter", () => ({
  listTasks: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } }),
  getTaskStats: jest.fn().mockResolvedValue(null),
  getAgentDigest: jest.fn().mockResolvedValue(null),
}));

const STATS: TaskStatsDTO = {
  open: 14,
  overdue: 2,
  due_today: 6,
  unassigned: 1,
  agent: { open: 18, deferred: 3, failed: 1, awaiting: 5, converted: 3 },
};

const overdueTask = {
  id: "t1",
  kind: "task",
  title: "Llamar para confirmar",
  contact_name: "Luis Pardo",
  task_status: "open",
  due_at: "2020-01-01T10:00:00Z",
  assignee_type: "user",
  last_run_status: null,
} as unknown as ActivityDTO;

afterEach(cleanup);
beforeEach(() => useTasksStore.setState({ due: null, runStatus: null, executor: null }));

describe("TasksNextUpIsland", () => {
  it("mientras llegan las cifras pinta su silueta, no una isla", () => {
    render(<TasksNextUpIsland stats={null} digest={null} items={[]} agentMode={false} />);
    expect(screen.queryByRole("region", { name: "Lo próximo" })).toBeNull();
  });

  it("con vencidas nombra la primera cargada y lleva al filtro", () => {
    render(<TasksNextUpIsland stats={STATS} digest={null} items={[overdueTask]} agentMode={false} />);
    expect(screen.getByText("2 vencidas")).toBeInTheDocument();
    expect(screen.getByText("La primera: Llamar para confirmar con Luis Pardo.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver las vencidas/ }));
    expect(useTasksStore.getState().due).toBe("overdue");
  });

  it("en modo agente es el parte de Axi y su acción es lo que no salió", () => {
    render(
      <TasksNextUpIsland
        stats={STATS}
        digest={{ window: "today", day: "2026-09-26", counts: { reached: 12, replied: 5, converted: 3, calls_connected: 0, failed: 1 } }}
        items={[]}
        agentMode
      />,
    );
    expect(screen.getByRole("region", { name: "El parte de Axi" })).toBeInTheDocument();
    expect(screen.getByText("3 en compra")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar el que no salió" }));
    expect(useTasksStore.getState().runStatus).toBe("failed");
  });
});
