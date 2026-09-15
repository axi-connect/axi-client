import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { TaskStatsDTO } from "@/modules/crm/domain/activity";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";
import { TaskScoreboard } from "../TaskScoreboard";

jest.mock("@/modules/crm/infrastructure/services/activities-service.adapter", () => ({
  listTasks: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } }),
  getTaskStats: jest.fn().mockResolvedValue(null),
  // Declarado aunque el marcador no lo dispare: si un refresco acabara
  // llamándolo, la factoría sin esta clave revienta con «is not a function».
  getAgentDigest: jest.fn().mockResolvedValue(null),
}));

const STATS: TaskStatsDTO = {
  open: 14,
  overdue: 2,
  due_today: 6,
  unassigned: 1,
  agent: { open: 18, deferred: 3, failed: 1, awaiting: 5, converted: 3 },
};

function reset() {
  useTasksStore.setState({
    tab: "me",
    due: null,
    executor: null,
    runStatus: null,
    awaiting: false,
    q: "",
    digest: null,
  });
}

afterEach(cleanup);
beforeEach(reset);

describe("TaskScoreboard — la cifra es el filtro", () => {
  it("pulsar «vencidas» filtra por vencimiento, que es lo que antes hacía un segmentado aparte", () => {
    render(<TaskScoreboard stats={STATS} executor={null} />);

    fireEvent.click(screen.getByRole("button", { name: /vencidas/i }));

    expect(useTasksStore.getState().due).toBe("overdue");
  });

  it("«abiertas» conserva el alcance que el operador eligió", () => {
    // La ficha mueve el vencimiento; si además reseteara la asignación, elegir
    // «Todas» y volver a «abiertas» te devolvería a «Mis tareas» sin pedirlo.
    useTasksStore.setState({ tab: "all", due: "overdue" });
    render(<TaskScoreboard stats={STATS} executor={null} />);

    fireEvent.click(screen.getByRole("button", { name: /abiertas/i }));

    expect(useTasksStore.getState()).toMatchObject({ tab: "all", due: null });
  });

  it("«sin asignar» sí mueve los dos ejes, y en una sola petición", () => {
    render(<TaskScoreboard stats={STATS} executor={null} />);

    fireEvent.click(screen.getByRole("button", { name: /sin asignar/i }));

    expect(useTasksStore.getState()).toMatchObject({ tab: "unassigned", due: null });
  });

  it("marca la ficha activa para que se vea qué está filtrando", () => {
    useTasksStore.setState({ due: "today" });
    render(<TaskScoreboard stats={STATS} executor={null} />);

    expect(screen.getByRole("button", { name: /para hoy/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /abiertas/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("TaskScoreboard — modo agente", () => {
  it("sus fichas sustituyen al segmentado «Última ejecución»", () => {
    render(<TaskScoreboard stats={STATS} executor="agent" />);

    fireEvent.click(screen.getByRole("button", { name: /en espera/i }));
    expect(useTasksStore.getState().runStatus).toBe("deferred");

    fireEvent.click(screen.getByRole("button", { name: /esperando respuesta/i }));
    expect(useTasksStore.getState()).toMatchObject({ awaiting: true, runStatus: null });
  });

  it("la conversión NO vive aquí: el marcador es de filtros", () => {
    // No hay consulta que devuelva «las que acabaron en compra», así que
    // pintarla como ficha prometería un filtro que al pulsarlo no haría nada.
    // Su sitio es la línea del parte, donde se cuentan resultados.
    render(<TaskScoreboard stats={STATS} executor="agent" />);

    expect(screen.queryByText(/acabaron en compra/i)).toBeNull();
  });

  it("cada celda lleva su icono, y es decorativo para el lector de pantalla", () => {
    const { container } = render(<TaskScoreboard stats={STATS} executor={null} />);

    expect(container.querySelectorAll("svg[aria-hidden='true']").length).toBe(4);
  });
});
