import { cleanup, render, screen } from "@testing-library/react";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import { TaskDayList } from "../TaskDayList";

jest.mock("@/modules/crm/infrastructure/services/activities-service.adapter", () => ({
  listTasks: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } }),
  getTaskStats: jest.fn().mockResolvedValue(null),
  getAgentDigest: jest.fn().mockResolvedValue(null),
  completeTask: jest.fn(),
  reopenTask: jest.fn(),
  cancelTask: jest.fn(),
  runAgentTaskNow: jest.fn(),
}));

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

function task(over: Partial<ActivityDTO> = {}): ActivityDTO {
  return {
    id: "task-1",
    contact_id: "contact-1",
    contact_name: "Ana Gutiérrez",
    kind: "task",
    assignee_type: "user",
    task_status: "open",
    title: "Enviar la cotización",
    due_at: new Date(Date.now() + 3_600_000).toISOString(),
    next_run_at: null,
    last_run_status: null,
    last_run_reason: null,
    assigned_user_id: "user-1",
    assigned_agent_id: null,
    created_by_type: "user",
    ...over,
  } as ActivityDTO;
}

function list(over: Partial<ActivityDTO> = {}) {
  return render(
    <TaskDayList
      tasks={[task(over)]}
      tz="America/Bogota"
      agentNames={new Map()}
      onInspect={jest.fn()}
    />,
  );
}

afterEach(cleanup);

describe("TaskDayList — el contacto en la fila", () => {
  it("pinta a quién va el seguimiento", () => {
    list();
    expect(screen.getByText("Ana Gutiérrez")).toBeInTheDocument();
  });

  it("el NOMBRE es el enlace al contacto", () => {
    // Antes era un icono de 16 px sin nombre al otro extremo de la fila: una
    // afordancia en vez de dos, y un objetivo de clic de varias palabras.
    list();
    expect(screen.getByRole("link", { name: "Ana Gutiérrez" })).toHaveAttribute(
      "href",
      "/crm/contacts/contact-1",
    );
  });

  it("ya no queda el enlace-icono «Ver contacto»", () => {
    list();
    expect(screen.queryByRole("link", { name: /ver contacto/i })).toBeNull();
  });

  it("sin nombre, el literal lo pone la interfaz y queda atenuado", () => {
    // El servidor manda `null` cuando el contacto no tiene NADA: inventar el
    // nombre en la API impediría distinguir «no tiene» de «se llama así».
    list({ contact_name: null });
    expect(screen.getByRole("link", { name: "Sin nombre" })).toBeInTheDocument();
  });
});
