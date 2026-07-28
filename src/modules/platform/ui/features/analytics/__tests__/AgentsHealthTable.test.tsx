import { fireEvent, render, screen } from "@testing-library/react";
import type { AgentHealth } from "../../../../domain/analytics";
import { AgentsHealthTable } from "../AgentsHealthTable";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const AGENT: AgentHealth = {
  company_id: "t-1",
  company_name: "Acme Corp",
  agent_id: "ag-1",
  agent_name: "soporte-bot",
  agent_status: "active",
  turns: 320,
  failed_turns: 40,
  failure_rate_pct: 12.5,
  escalated_by_failure: 8,
  latency_p95_ms: 6200,
  evaluations: 45,
  avg_overall_score: 58,
  major_hallucinations: 3,
};

describe("AgentsHealthTable (a11y)", () => {
  beforeEach(() => push.mockClear());

  it("la fila es operable por teclado: Enter navega al tenant", () => {
    render(<AgentsHealthTable agents={[AGENT]} />);
    const row = screen.getByLabelText("Ver tenant de soporte-bot");

    expect(row).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/platform/tenants/t-1");
  });

  it("los headers anuncian aria-sort según el estado del orden", () => {
    render(<AgentsHealthTable agents={[AGENT]} />);
    const header = screen.getByRole("button", { name: "Ordenar por Turnos" }).closest("th")!;

    expect(header).toHaveAttribute("aria-sort", "none");
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Turnos" }));
    expect(header).toHaveAttribute("aria-sort", "ascending");
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Turnos" }));
    expect(header).toHaveAttribute("aria-sort", "descending");
    // Tercer click: vuelve al orden del backend.
    fireEvent.click(screen.getByRole("button", { name: "Ordenar por Turnos" }));
    expect(header).toHaveAttribute("aria-sort", "none");
  });
});
