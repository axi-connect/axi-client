import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AgentDigestDTO } from "@/modules/crm/domain/activity";
import { useTasksStore } from "@/modules/crm/infrastructure/stores/tasks.store";
import { AgentDigestLine } from "../AgentDigestLine";

jest.mock("@/modules/crm/infrastructure/services/activities-service.adapter", () => ({
  listTasks: jest.fn().mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } }),
  getTaskStats: jest.fn().mockResolvedValue(null),
  getAgentDigest: jest.fn().mockResolvedValue(null),
}));

function digest(over: Partial<AgentDigestDTO["counts"]> = {}, window: "today" | "yesterday" = "today"): AgentDigestDTO {
  return {
    window,
    day: "2026-09-18",
    counts: { reached: 12, replied: 4, converted: 2, calls_connected: 2, failed: 1, ...over },
  };
}

afterEach(cleanup);
beforeEach(() => {
  useTasksStore.setState({ executor: null, runStatus: null, awaiting: false });
});

describe("AgentDigestLine", () => {
  it("«sin enviar» es la única cifra con control, y lleva a esas filas", () => {
    // No informa de un fallo: te deja delante de él.
    render(<AgentDigestLine digest={digest()} variant="full" />);

    fireEvent.click(screen.getByRole("button", { name: /sin enviar/i }));

    expect(useTasksStore.getState().runStatus).toBe("failed");
  });

  it("sin fallos no hay botón", () => {
    render(<AgentDigestLine digest={digest({ failed: 0 })} variant="full" />);
    expect(screen.queryByRole("button", { name: /sin enviar/i })).toBeNull();
  });

  it("rotula «ayer» cuando el servidor cayó a la ventana anterior", () => {
    // A las nueve de la mañana un «0 seguimientos» se lee como avería.
    render(<AgentDigestLine digest={digest({}, "yesterday")} variant="full" />);
    expect(screen.getByText(/tus agentes · ayer/i)).toBeInTheDocument();
  });

  it("un día sin nada no ocupa sitio", () => {
    const { container } = render(
      <AgentDigestLine
        digest={digest({ reached: 0, replied: 0, converted: 0, calls_connected: 0, failed: 0 })}
        variant="full"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("el resumen de la bandeja mezclada lleva al modo agente", () => {
    render(<AgentDigestLine digest={digest()} variant="teaser" />);

    fireEvent.click(screen.getByRole("button", { name: /tus agentes/i }));

    expect(useTasksStore.getState().executor).toBe("agent");
  });

  it("y no aparece si el agente trabajó pero no hay desenlace", () => {
    const { container } = render(
      <AgentDigestLine digest={digest({ converted: 0, failed: 0 })} variant="teaser" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
