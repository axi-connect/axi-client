import { cleanup, render, screen } from "@testing-library/react";
import type { DealDTO } from "@/modules/crm/domain/deal";
import type { ContactJourneyDTO } from "@/modules/crm/domain/journey";
import type { ContactProfileDTO } from "@/modules/crm/domain/contact";
import { ContactNextUpIsland, ContactValueTile } from "../ContactNextUp";
import { ScorePanel } from "../ScorePanel";

afterEach(cleanup);

const journey = (days: number): ContactJourneyDTO => ({
  deal: { id: "d1", title: "Cancún todo incluido", value_cents: 12_400_000_00, ai_moves_paused: false },
  stage: { name: "Calificado", stage_kind: "qualified", entered_at: "2026-09-16T00:00:00Z", days_in_stage: days, rotting_days: 7 },
  last_move: null,
  cadence: null,
  ambiguous: false,
});

const order = (over: Partial<{ payment_state: string; balance_cents: number; total_cents: number }> = {}) => ({
  id: "o1",
  order_number: 41,
  currency: "COP",
  payment_state: "paid",
  balance_cents: 0,
  total_cents: 13_520_400_00,
  ...over,
});

describe("ContactNextUpIsland — lo más grave, y nada mientras decide", () => {
  it("mientras llega el recorrido pinta la silueta, no una isla", () => {
    render(<ContactNextUpIsland journey={undefined} orders={[]} followUpHref="/x" />);
    expect(screen.queryByRole("region", { name: "Lo próximo" })).toBeNull();
  });
  it("si se enfría, lo dice y ofrece agendar el seguimiento", () => {
    render(<ContactNextUpIsland journey={journey(9)} orders={[]} followUpHref="/crm/tasks/create?contact_id=c" />);
    expect(screen.getByText("Se enfría en Calificado")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Agendar seguimiento" })).toHaveAttribute("href", "/crm/tasks/create?contact_id=c");
    expect(screen.getByRole("link", { name: "Ver la oportunidad" })).toHaveAttribute("href", "/crm/pipeline/deal/d1");
  });
  it("sin enfriarse pero con saldo, manda al pedido", () => {
    render(<ContactNextUpIsland journey={journey(2)} orders={[order({ payment_state: "partial", balance_cents: 500_000_00 })]} followUpHref="/x" />);
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir el pedido" })).toHaveAttribute("href", "/orders/o1");
  });
  it("sin recorrido ni saldo, «Todo al día» sin botones", () => {
    render(<ContactNextUpIsland journey={null} orders={[order()]} followUpHref="/x" />);
    expect(screen.getByText("Todo al día")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("ContactValueTile — con lo que la ficha ya trajo", () => {
  const openDeal = { status: "open", value_cents: 12_400_000_00, currency: "COP" } as DealDTO;
  it("sin permiso de pedidos no se pinta", () => {
    const { container } = render(<ContactValueTile orders={null} deals={[openDeal]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it("cuenta lo pagado, si debe, y lo abierto", () => {
    render(<ContactValueTile orders={[order(), order({ payment_state: "partial", balance_cents: 1_000_000_00, total_cents: 3_000_000_00 })]} deals={[openDeal]} />);
    expect(screen.getByText(/Pagados en 2 pedidos · debe \$\s?1 M/)).toBeInTheDocument();
    expect(screen.getByText(/1 oportunidad abierta por \$\s?12,4 M/)).toBeInTheDocument();
  });
  it("sin pedidos lo dice en palabras, no con un cero", () => {
    render(<ContactValueTile orders={[]} deals={[]} />);
    expect(screen.getByText("Aún sin pedidos")).toBeInTheDocument();
    expect(screen.getByText("Sin oportunidades abiertas.")).toBeInTheDocument();
  });
});

describe("ScorePanel — tramos, no anillo", () => {
  const profile: ContactProfileDTO = {
    contact_id: "c",
    score: 60,
    score_signals: { milestones: { engaged: {}, interest: {}, evaluating: { evidence: "order.quoted" } } },
    owner_user_id: null,
    last_activity_at: null,
    updated_at: "2026-09-01T00:00:00Z",
  };
  it("pinta cinco tramos con su hito para el lector de pantalla y la frase", () => {
    render(<ScorePanel profile={profile} />);
    expect(screen.getByText("60")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText("Evaluando: Recibió cotización")).toBeInTheDocument();
    expect(screen.getByText(/Compromiso: pendiente/)).toBeInTheDocument();
    expect(screen.getByText("Habló, se interesó y recibió cotización. Falta: compromiso y conversión.")).toBeInTheDocument();
  });
});
