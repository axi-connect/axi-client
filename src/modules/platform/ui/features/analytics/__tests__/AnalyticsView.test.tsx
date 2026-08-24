import { fireEvent, render, screen } from "@testing-library/react";
import { AnalyticsView } from "../AnalyticsView";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const healthResult = {
  current: {
    data: {
      period_days: 7,
      degraded: true,
      agents: [
        {
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
        },
      ],
      alerts_by_company: [{ company_id: "t-1", company_name: "Acme Corp", total: 9, triggered: 7 }],
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    dataUpdatedAt: Date.now(),
  },
};

const alertsByStatus: Record<string, unknown[]> = {
  triggered: [
    {
      id: "al-1",
      company_id: "t-1",
      company_name: "Acme Corp",
      rule: "failure_rate>10",
      subject_type: "agent",
      subject_id: "ag-1",
      window_start: "2026-07-17T09:00:00Z",
      value_at_trigger: 12,
      threshold: 10,
      status: "triggered",
      created_at: "2026-07-17T10:00:00Z",
    },
  ],
  acknowledged: [],
  resolved: [],
};

const lastAlertsCall = { status: "" };
jest.mock("../../../../infrastructure/api/hooks/use-analytics", () => ({
  useAgentsHealthQuery: () => healthResult.current,
  useAlertsQuery: (status: string) => {
    lastAlertsCall.status = status;
    const data = alertsByStatus[status] ?? [];
    return {
      data: { data, meta: { total: data.length, page: 1, page_size: 50, degraded: false } },
      isPending: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    };
  },
}));

describe("AnalyticsView", () => {
  it("degraded: true muestra el DegradedBanner SIN romper la tabla de triage", () => {
    render(<AnalyticsView />);

    expect(screen.getByText(/vista parcial/i)).toBeInTheDocument();
    expect(screen.getByText("soporte-bot")).toBeInTheDocument();
    expect(screen.getByText(/ordenado por severidad/i)).toBeInTheDocument();
    // Panel lateral alerts_by_company
    expect(screen.getByText(/alertas por tenant/i)).toBeInTheDocument();
  });

  it("el tab Alertas mapea el sub-tab al query param y es read-only", () => {
    render(<AnalyticsView />);
    // Radix Tabs activa en mouseDown (no en click) bajo jsdom.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Alertas" }));

    expect(lastAlertsCall.status).toBe("triggered");
    expect(screen.getByText("failure_rate>10")).toBeInTheDocument();

    // El filtro de estado es un radiogroup, no unas pestañas: no tiene panel
    // propio (la tabla de abajo es la misma), así que `role="tab"` prometía un
    // `tabpanel` inexistente. Cambió con la unificación de pestañas del panel.
    fireEvent.click(screen.getByRole("radio", { name: /resueltas/i }));
    expect(lastAlertsCall.status).toBe("resolved");
    expect(screen.getByText(/no hay alertas resueltas/i)).toBeInTheDocument();

    // Read-only: la tabla no expone acciones de mutación.
    expect(screen.queryByRole("button", { name: /reconocer|resolver|acknowledge/i })).not.toBeInTheDocument();
  });
});
