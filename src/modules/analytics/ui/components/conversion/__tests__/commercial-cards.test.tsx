import { render, screen, within } from "@testing-library/react";

import type { FunnelDTO, FunnelLiveRates } from "@/modules/analytics/domain/analytics";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { PipelineFlowCard } from "../PipelineFlowCard";
import { StageRatesCard } from "../StageRatesCard";

const permissions = new Set<string>();
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));

const LIVE: FunnelLiveRates = {
  call_answer_rate: 61.9,
  answered_to_meeting_rate: 44.2,
  meeting_show_rate: 78.9,
  meeting_to_sale_rate: 34.7,
  quote_to_sale_rate: 37.9,
  value_per_meeting_cents: 24_105_263_00,
  value_per_visit_cents: 30_533_333_00,
  samples: {
    calls_placed: 84,
    calls_answered: 52,
    appointments_booked: 95,
    appointments_completed: 75,
    appointments_no_show: 20,
    quotes: 87,
    orders_paid: 33,
    revenue_paid_cents: 2_290_000_000,
  },
};

function funnel(patch: Partial<FunnelDTO> = {}): FunnelDTO {
  return {
    period: "30d",
    period_start: "2026-08-24",
    period_end: "2026-09-23",
    currency: "COP",
    live_rates: LIVE,
    pipeline: {
      stages: [
        { stage_kind: "contacted", name: "Contactado", entered: 214, advanced: 95, avg_days_in_stage: 2.1, conversion_pct: 44 },
        { stage_kind: "new", name: "Consulta", entered: 640, advanced: 214, avg_days_in_stage: 1.2, conversion_pct: 33 },
        { stage_kind: "proposal", name: "", entered: 0, advanced: 0, avg_days_in_stage: null, conversion_pct: null },
      ],
    },
    ...patch,
  } as FunnelDTO;
}

const ready = (data: FunnelDTO): Section<FunnelDTO> => ({ status: "ready", data, error: null });

describe("StageRatesCard", () => {
  it("cada tasa con su divisor; la de la ruta marcada", () => {
    render(<StageRatesCard section={ready(funnel())} onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Tasas vivas · 30 días" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tasas vivas" });
    expect(within(list).getByText("61,9 %")).toBeInTheDocument();
    expect(within(list).getByText("52 de 84 llamadas")).toBeInTheDocument();
    expect(within(list).getByText("75 de 95 citas · 20 no asistieron")).toBeInTheDocument();
    // Asistió → venta sale de los mismos conteos: 33 ÷ 75.
    expect(within(list).getByText("Asistió → venta")).toBeInTheDocument();
    expect(within(list).getByText("44 %")).toBeInTheDocument();
    expect(within(list).getByText(/la tasa que usa la ruta/)).toBeInTheDocument();
    expect(within(list).getByText("Valor por visita")).toBeInTheDocument();
  });

  it("una fila sin muestra NO se pinta (ni 0 % ni —)", () => {
    const noCalls: FunnelLiveRates = {
      ...LIVE,
      call_answer_rate: null,
      answered_to_meeting_rate: null,
      samples: { ...LIVE.samples, calls_placed: 0, calls_answered: 0 },
    };
    render(<StageRatesCard section={ready(funnel({ live_rates: noCalls }))} onRetry={jest.fn()} />);
    expect(screen.queryByText("Llamadas → contestadas")).toBeNull();
    expect(screen.queryByText("Contestadas → cita agendada")).toBeNull();
    expect(screen.getByText("Cita agendada → venta")).toBeInTheDocument();
  });

  it("sin nada medido, una frase; cargando, skeleton", () => {
    const { rerender } = render(<StageRatesCard section={ready(funnel({ live_rates: null }))} onRetry={jest.fn()} />);
    expect(screen.getByText(/Aún no hay llamadas, citas ni ventas medidas/)).toBeInTheDocument();
    rerender(<StageRatesCard section={{ status: "loading", data: null, error: null }} onRetry={jest.fn()} />);
    expect(screen.getByRole("status", { name: "Cargando tasas vivas" })).toBeInTheDocument();
  });
});

describe("PipelineFlowCard", () => {
  it("en orden semántico, con el nombre del tenant y el paso siguiente", () => {
    render(<PipelineFlowCard section={ready(funnel())} onRetry={jest.fn()} />);
    const items = within(screen.getByRole("list", { name: "Recorrido del pipeline" })).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Consulta → Contactado");
    expect(items[0]).toHaveTextContent("33 % avanza");
    expect(items[0]).toHaveTextContent("214 de 640 · 1,2 días en promedio");
    // Nombre vacío → la etiqueta del tipo; sin nadie que entrara, sin porcentaje inventado.
    expect(items[2]).toHaveTextContent("Propuesta");
    expect(items[2]).toHaveTextContent("Sin movimientos");
  });

  it("«Ajustar el recorrido» solo con crm:manage", () => {
    const { rerender } = render(<PipelineFlowCard section={ready(funnel())} onRetry={jest.fn()} />);
    expect(screen.queryByRole("link", { name: /Ajustar el recorrido/ })).toBeNull();
    permissions.add("crm:manage");
    rerender(<PipelineFlowCard section={ready(funnel())} onRetry={jest.fn()} />);
    expect(screen.getByRole("link", { name: /Ajustar el recorrido/ })).toHaveAttribute("href", "/crm/settings/recorrido");
  });

  it("sin etapas semánticas ni movimientos, una frase", () => {
    render(<PipelineFlowCard section={ready(funnel({ pipeline: null }))} onRetry={jest.fn()} />);
    expect(screen.getByText(/Sin movimientos entre etapas en este período/)).toBeInTheDocument();
  });
});
