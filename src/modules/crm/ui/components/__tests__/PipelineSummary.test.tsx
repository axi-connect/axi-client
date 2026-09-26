import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { DealDTO, DealStatsDTO, PipelineStageDTO } from "@/modules/crm/domain/deal";
import { PipelineSummary } from "../PipelineSummary";

afterEach(cleanup);

const DAY = 86_400_000;

const STATS: DealStatsDTO = {
  period: "30d",
  period_start: null,
  period_end: null,
  currency: "COP",
  open_count: 23,
  open_value_cents: 96_400_000_00,
  weighted_forecast_cents: 36_000_000_00,
  won_count: 7,
  won_value_cents: 31_500_000_00,
  lost_count: 10,
  win_rate_pct: 41,
  avg_cycle_days: 18,
};

const STAGES = [
  { id: "s-prop", name: "Propuesta", rotting_days: 10, position: 3, probability_pct: 60 },
] as unknown as PipelineStageDTO[];

function deal(id: string, daysInStage: number, name: string): DealDTO {
  return {
    id,
    title: `Viaje ${id}`,
    stage_id: "s-prop",
    status: "open",
    value_cents: 8_900_000_00,
    currency: "COP",
    stage_entered_at: new Date(Date.now() - daysInStage * DAY).toISOString(),
    contact: { id: "c", full_name: name, phone: null, avatar_url: null },
  } as unknown as DealDTO;
}

describe("PipelineSummary — el bento del pipeline", () => {
  it("cuenta las cifras con su procedencia", () => {
    render(<PipelineSummary stats={STATS} period="30d" deals={[]} stages={STAGES} boardLoaded onOpenDeal={jest.fn()} />);
    expect(screen.getByText("Pronóstico ponderado")).toBeTruthy();
    expect(screen.getByText("Valor × probabilidad de cada etapa, en 23 abiertas")).toBeTruthy();
    expect(screen.getByText("41 %")).toBeTruthy();
    expect(screen.getByText("7 de 17 cerradas")).toBeTruthy();
    expect(screen.getByText("Ciclo medio de 18 días, de abrir a ganar")).toBeTruthy();
  });

  it("un ciclo medio de cero días no se lee «de hoy»", () => {
    render(<PipelineSummary stats={{ ...STATS, avg_cycle_days: 0 }} period="30d" deals={[]} stages={STAGES} boardLoaded onOpenDeal={jest.fn()} />);
    expect(screen.getByText("Se ganan el mismo día en que se abren")).toBeTruthy();
    expect(screen.queryByText(/Ciclo medio de hoy/)).toBeNull();
  });

  it("sin cierres no inventa una tasa", () => {
    render(
      <PipelineSummary
        stats={{ ...STATS, won_count: 0, lost_count: 0, win_rate_pct: null }}
        period="7d"
        deals={[]}
        stages={STAGES}
        boardLoaded
        onOpenDeal={jest.fn()}
      />,
    );
    expect(screen.getByText("Aún sin cierres")).toBeTruthy();
    expect(screen.queryByText(/%$/)).toBeNull();
    expect(screen.getByText("Tasa de cierre · 7 días")).toBeTruthy();
  });

  it("la isla nombra la que más se pasó y abre esa", () => {
    const onOpen = jest.fn();
    render(
      <PipelineSummary
        stats={STATS}
        period="30d"
        deals={[deal("a", 11, "Ana Gómez"), deal("b", 15, "Luis Pardo"), deal("c", 2, "Nadie")]}
        stages={STAGES}
        boardLoaded
        onOpenDeal={onOpen}
      />,
    );
    expect(screen.getByText("2 se enfrían")).toBeTruthy();
    expect(screen.getByText(/La primera: Luis Pardo, 15 días en Propuesta/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Ver la primera/ }));
    expect(onOpen).toHaveBeenCalledWith("b");
  });

  it("sin ninguna quieta dice que todo se mueve", () => {
    render(<PipelineSummary stats={STATS} period="30d" deals={[deal("c", 2, "X")]} stages={STAGES} boardLoaded onOpenDeal={jest.fn()} />);
    expect(screen.getByText("Todo en movimiento")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Ver la primera/ })).toBeNull();
  });

  it("mientras carga no pinta ni cifras ni la isla", () => {
    render(<PipelineSummary stats={null} period="30d" deals={[]} stages={STAGES} boardLoaded={false} onOpenDeal={jest.fn()} />);
    expect(screen.queryByText("Todo en movimiento")).toBeNull();
    expect(screen.queryByText("Pronóstico ponderado")).toBeNull();
  });
});
