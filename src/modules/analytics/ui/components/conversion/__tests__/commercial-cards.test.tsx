import { render, screen, within } from "@testing-library/react";

import type { FunnelDTO, FunnelLiveRates } from "@/modules/analytics/domain/analytics";
import type { Section } from "@/modules/analytics/infrastructure/stores/analytics.store";
import { PipelineFlowCard } from "../PipelineFlowCard";
import { StageRatesCard } from "../StageRatesCard";

const permissions = new Set<string>();
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
let mockRouteRates: ReadonlySet<string> | null = new Set(["quote_to_sale"]);
jest.mock("@/modules/commercial/public", () => ({ useRouteRates: () => mockRouteRates }));

const LIVE: FunnelLiveRates = {
  call_answer_rate: 61.9,
  answered_to_meeting_rate: 44.2,
  meeting_show_rate: 78.9,
  meeting_to_sale_rate: 34.7,
  quote_to_sale_rate: 37.9,
  value_per_meeting_cents: 24_105_263_00,
  value_per_visit_cents: 30_533_333_00,
  rate_samples: {
    call_answer: { numerator: 52, denominator: 84, capped: false },
    answered_to_meeting: { numerator: 23, denominator: 52, capped: false },
    meeting_show: { numerator: 75, denominator: 95, capped: false },
    meeting_to_sale: { numerator: 26, denominator: 75, capped: false },
    quote_to_sale: { numerator: 33, denominator: 87, capped: false },
  },
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

beforeEach(() => {
  mockRouteRates = new Set(["quote_to_sale"]);
});

describe("StageRatesCard", () => {
  it("cada tasa con SU muestra («X de N»); la de la ruta marcada por el plan", () => {
    render(<StageRatesCard section={ready(funnel())} onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Tasas vivas · 30 días" })).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Tasas vivas" });
    expect(within(list).getByText("61,9 %")).toBeInTheDocument();
    expect(within(list).getByText("52 de 84 llamadas")).toBeInTheDocument();
    // C2: la muestra de ESTA tasa (citas sobre contestadas), no las citas agendadas de otra cosa.
    expect(within(list).getByText("23 de 52 contestadas")).toBeInTheDocument();
    expect(within(list).getByText("75 de 95 citas · 20 no asistieron")).toBeInTheDocument();
    expect(within(list).getByText("Asistió → venta")).toBeInTheDocument();
    expect(within(list).getByText("26 de 75 personas que asistieron")).toBeInTheDocument();
    expect(within(list).getByText("33 de 87 cotizaciones · la tasa que usa la ruta")).toBeInTheDocument();
    expect(within(list).getAllByText(/la tasa que usa la ruta/)).toHaveLength(1);
    expect(within(list).getByText("Valor por visita")).toBeInTheDocument();
    // C3: ya no se calcula en el cliente una «Asistió → venta» aparte.
    expect(within(list).getAllByText("Asistió → venta")).toHaveLength(1);
  });

  it("sin la muestra por tasa (servidor viejo) dice solo el divisor, nunca «X de N» inventado (C2)", () => {
    const legacy: Partial<FunnelLiveRates> = { ...LIVE };
    delete legacy.rate_samples;
    render(<StageRatesCard section={ready(funnel({ live_rates: legacy as FunnelLiveRates }))} onRetry={jest.fn()} />);
    const list = screen.getByRole("list", { name: "Tasas vivas" });
    expect(within(list).getByText("sobre 52 contestadas")).toBeInTheDocument();
    expect(within(list).getByText("sobre 84 llamadas")).toBeInTheDocument();
  });

  it("una tasa > 100 % o topada por el servidor no se pinta (C3)", () => {
    const odd: FunnelLiveRates = {
      ...LIVE,
      quote_to_sale_rate: 100,
      meeting_show_rate: 112.5,
      rate_samples: { ...LIVE.rate_samples, quote_to_sale: { numerator: 50, denominator: 45, capped: true } },
    };
    render(<StageRatesCard section={ready(funnel({ live_rates: odd }))} onRetry={jest.fn()} />);
    expect(screen.queryByText("Cotización → venta")).toBeNull();
    expect(screen.queryByText("Cita agendada → asistió")).toBeNull();
    expect(screen.getByText("Llamadas → contestadas")).toBeInTheDocument();
  });

  it("la marca de la ruta sale del plan: cita → venta si el plan la usa, ninguna sin plan (C11)", () => {
    mockRouteRates = new Set(["quote_to_sale", "meeting_to_sale"]);
    const { rerender } = render(<StageRatesCard section={ready(funnel())} onRetry={jest.fn()} />);
    expect(screen.getByText("26 de 75 personas que asistieron · la tasa que usa la ruta")).toBeInTheDocument();
    mockRouteRates = null;
    rerender(<StageRatesCard section={ready(funnel({ period: "7d" }))} onRetry={jest.fn()} />);
    expect(screen.queryByText(/la tasa que usa la ruta/)).toBeNull();
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
    expect(screen.getByText("Asistió → venta")).toBeInTheDocument();
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
