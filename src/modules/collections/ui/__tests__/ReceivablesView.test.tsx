import { render, screen, waitFor } from "@testing-library/react";

const mockList = jest.fn<Promise<unknown>, [unknown]>();
const mockStats = jest.fn<Promise<unknown>, []>();
jest.mock("@/modules/collections/infrastructure/services/collections-service.adapter", () => ({
  listReceivables: (params: unknown) => mockList(params),
  getReceivablesStats: () => mockStats(),
}));

const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: mockShowAlert }),
}));

import { HttpError } from "@/core/api/problem";
import { ReceivablesView } from "@/modules/collections/ui/ReceivablesView";

const row = (overrides: Record<string, unknown> = {}) => ({
  plan_id: "p1",
  order_id: "o1",
  order_number: 42,
  contact_id: "c1",
  contact_name: "Laura Gómez",
  service_date: null,
  travelled: false,
  currency: "COP",
  total_cents: 1_000_000,
  paid_cents: 300_000,
  balance_cents: 700_000,
  next_due_at: null,
  days_overdue: 0,
  bucket: "current",
  installments_total: 3,
  installments_paid: 1,
  active_promise_at: null,
  assigned_user_id: null,
  ...overrides,
});

const stats = (overrides: Record<string, unknown> = {}) => ({
  outstanding_cents: 4_692_720,
  overdue_cents: 1_578_000,
  travelled_cents: 1_230_000,
  promised_cents: 0,
  plans_active: 6,
  plans_overdue: 3,
  contacts_overdue: 3,
  ...overrides,
});

describe("ReceivablesView (F4: la cartera abre con la respuesta)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lo primero es cuánto te deben, y la frase nombra los importes", async () => {
    mockList.mockResolvedValue({ data: [row()], meta: { total: 1, page: 1, page_size: 100 } });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    expect(await screen.findByText("Te deben")).toBeInTheDocument();
    expect(screen.getByText("$ 46.927")).toBeInTheDocument();
    // Los importes van en la frase; una leyenda de colores los repetiría.
    expect(screen.getByText("$ 15.780")).toBeInTheDocument();
  });

  it("agrupa por urgencia y encabeza con quien ya viajó y debe", async () => {
    mockList.mockResolvedValue({
      data: [
        row({ plan_id: "a", order_id: "a", contact_name: "Camilo Ortiz", travelled: true, days_overdue: 47, next_due_at: "2026-08-01" }),
        row({ plan_id: "b", order_id: "b", contact_name: "Diana Salazar", days_overdue: 6, next_due_at: "2026-09-11" }),
      ],
      meta: { total: 2, page: 1, page_size: 100 },
    });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    const headings = await screen.findAllByRole("heading", { level: 2 });
    expect(headings[0]).toHaveTextContent("Ya viajaron y deben");
    expect(headings[1]).toHaveTextContent("En mora");
    // La mora se dice en días, no en un color.
    expect(screen.getByText("Venció hace 47 días")).toBeInTheDocument();
  });

  it("sin la función lo dice: no hay cartera, no es una lista vacía", async () => {
    // Savage cobra de una. Un listado vacío haría creer que nadie debe.
    const denied = new HttpError({
      status: 403,
      code: "features/feature_disabled",
      message: "Función deshabilitada",
    });
    mockList.mockRejectedValue(denied);
    mockStats.mockRejectedValue(denied);

    render(<ReceivablesView />);

    expect(await screen.findByText("Aquí no hay cartera")).toBeInTheDocument();
  });

  it("cada fila lleva a su pedido, con una sola diana", async () => {
    mockList.mockResolvedValue({ data: [row()], meta: { total: 1, page: 1, page_size: 100 } });
    mockStats.mockResolvedValue(stats());

    render(<ReceivablesView />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Laura Gómez/ })).toHaveAttribute(
        "href",
        "/orders/o1",
      );
    });
  });
});
