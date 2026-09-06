import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { formatMoney } from "@/core/lib/format";
import type { ActivationDTO, ActivationQuoteDTO } from "@/modules/billing/domain/activation";
import { useActivationStore } from "@/modules/billing/infrastructure/stores/activation.store";
import { ActivationCard } from "../components/ActivationCard";

const getActivation = jest.fn();
const confirmActivation = jest.fn();
const issueInvoiceLink = jest.fn();
const start = jest.fn();
const showAlert = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getActivation: () => getActivation(),
  confirmActivation: (body: unknown) => confirmActivation(body),
  issueInvoiceLink: (id: string) => issueInvoiceLink(id),
}));

jest.mock("@/modules/billing/infrastructure/hooks/use-start-checkout", () => ({
  useStartCheckout: () => ({ start: (id: string) => start(id), starting: false }),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: (args: unknown) => showAlert(args) }),
}));

function money(cents: number): string {
  return formatMoney(cents, "COP").replace(/\s+/g, " ");
}

const QUOTE: ActivationQuoteDTO = {
  plan_code: "crecimiento",
  plan_name: "Crecimiento",
  volume_tier_code: "t1000",
  volume_label: "1.000",
  interval: "monthly",
  list_amount_cents: 36_990_000,
  amount_cents: 22_190_000,
  currency: "COP",
  promotion_code: "founders_2026",
  promotion_name: "Programa Fundadores",
  promotion_outcome: "applied",
  promotion_ends_at: "2027-01-01T05:00:00.000Z",
};

function view(over: Partial<ActivationDTO> = {}): ActivationDTO {
  return {
    state: "ready",
    offer: null,
    quote_saved: {
      amount_cents: 22_190_000,
      list_amount_cents: 36_990_000,
      currency: "COP",
      quoted_at: "2026-09-05T10:00:00.000Z",
      expires_at: "2027-01-01T05:00:00.000Z",
    },
    quote_now: QUOTE,
    price_changed: false,
    quote_honored: false,
    quote_valid_until: "2027-01-01T05:00:00.000Z",
    trial_ends_at: "2026-09-12T12:00:00.000Z",
    pending_invoice: null,
    term: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useActivationStore.setState({
    status: "idle",
    view: null,
    error: null,
    confirming: false,
    priceChange: null,
  });
});

describe("ActivationCard — ready", () => {
  it("pinta la oferta, el precio tachado, el final y el ahorro", async () => {
    getActivation.mockResolvedValue(view());
    render(<ActivationCard canPay />);

    await waitFor(() => expect(screen.getByText("Sigue vendiendo sin pausa.")).toBeInTheDocument());
    expect(
      screen.getByText("Crecimiento · 1.000 conversaciones al mes · Pago mensual"),
    ).toBeInTheDocument();
    expect(screen.getByText(money(36_990_000))).toBeInTheDocument();
    expect(screen.getByText(money(22_190_000))).toBeInTheDocument();
    expect(screen.getByText(/Ahorras/)).toHaveTextContent(money(14_800_000));
    expect(screen.getByText(/Programa Fundadores hasta el/)).toBeInTheDocument();
  });

  it("confirmar manda lo que el cliente vio y abre el checkout de la factura", async () => {
    getActivation.mockResolvedValue(view());
    confirmActivation.mockResolvedValue({
      term_id: "t1",
      invoice_id: "inv-1",
      invoice_number: "AXI-000042",
      amount_cents: 22_190_000,
      currency: "COP",
      due_at: "2026-09-12T12:00:00.000Z",
      reused: false,
    });
    render(<ActivationCard canPay />);
    await waitFor(() => screen.getByRole("button", { name: "Confirmar y pagar" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmar y pagar" }));

    await waitFor(() => expect(start).toHaveBeenCalledWith("inv-1"));
    expect(confirmActivation).toHaveBeenCalledWith({
      expected_amount_cents: 22_190_000,
      accept_current_price: undefined,
    });
  });

  it("sin billing:pay el botón está deshabilitado y lo dice", async () => {
    getActivation.mockResolvedValue(view());
    render(<ActivationCard canPay={false} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar y pagar" })).toBeDisabled(),
    );
    expect(screen.getByText(/Solo quien administra la facturación/)).toBeInTheDocument();
  });

  it("con el plan activo no pinta nada", async () => {
    getActivation.mockResolvedValue(view({ state: "active" }));
    const { container } = render(<ActivationCard canPay />);
    await waitFor(() => expect(useActivationStore.getState().status).toBe("ready"));
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ActivationCard — el precio cambió (B-D6)", () => {
  it("un 409 al confirmar cambia la tarjeta a la segunda confirmación con el antes y el después", async () => {
    getActivation.mockResolvedValue(view());
    confirmActivation.mockRejectedValueOnce(
      new HttpError({
        status: 409,
        code: "billing/price_changed",
        message: "cambió",
        problem: {
          type: "about:blank",
          title: "cambió",
          status: 409,
          code: "billing/price_changed",
          details: {
            quote_now: { ...QUOTE, amount_cents: 36_990_000, promotion_code: null, promotion_name: null },
          },
        },
      }),
    );
    render(<ActivationCard canPay />);
    await waitFor(() => screen.getByRole("button", { name: "Confirmar y pagar" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmar y pagar" }));

    await waitFor(() => expect(screen.getByText("Tu plan sigue guardado.")).toBeInTheDocument());
    expect(screen.getByText("Precio actualizado")).toBeInTheDocument();
    // Antes (lo que vio) tachado; ahora, el de hoy.
    expect(screen.getByText(/Antes/)).toHaveTextContent(money(22_190_000));
    expect(screen.getByText(money(36_990_000))).toBeInTheDocument();
    // No se abrió ningún pago: nunca se factura un precio no visto.
    expect(start).not.toHaveBeenCalled();

    // La segunda confirmación va con accept_current_price.
    confirmActivation.mockResolvedValueOnce({
      term_id: "t1",
      invoice_id: "inv-2",
      invoice_number: "AXI-000043",
      amount_cents: 36_990_000,
      currency: "COP",
      due_at: "2026-09-12T12:00:00.000Z",
      reused: false,
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar al precio de hoy" }));
    await waitFor(() => expect(start).toHaveBeenCalledWith("inv-2"));
    expect(confirmActivation).toHaveBeenLastCalledWith({
      expected_amount_cents: 36_990_000,
      accept_current_price: true,
    });
  });

  it("la cotización vencida dice su causa y pide la misma segunda confirmación", async () => {
    getActivation.mockResolvedValue(
      view({
        state: "expired_quote",
        price_changed: true,
        quote_valid_until: "2026-09-19T12:00:00.000Z",
        quote_now: { ...QUOTE, amount_cents: 36_990_000, promotion_code: null },
      }),
    );
    render(<ActivationCard canPay />);
    await waitFor(() => expect(screen.getByText("Cotización vencida")).toBeInTheDocument());
    expect(screen.getByText(/Tu cotización venció el/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar al precio de hoy" })).toBeInTheDocument();
  });

  it("un refresco de la vista limpia la cotización del 409 anterior (B4-B1)", async () => {
    getActivation.mockResolvedValue(view());
    render(<ActivationCard canPay />);
    await waitFor(() => screen.getByRole("button", { name: "Confirmar y pagar" }));
    useActivationStore.setState({ priceChange: { ...QUOTE, amount_cents: 36_990_000 } });
    await useActivationStore.getState().refresh();
    expect(useActivationStore.getState().priceChange).toBeNull();
  });

  it("la vista ya puede venir con price_changed: mismo trabajo sin pasar por el 409", async () => {
    getActivation.mockResolvedValue(
      view({ price_changed: true, quote_now: { ...QUOTE, amount_cents: 36_990_000, promotion_code: null } }),
    );
    render(<ActivationCard canPay />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Confirmar al precio de hoy" })).toBeInTheDocument(),
    );
  });
});

describe("ActivationCard — pendiente de pago", () => {
  it("muestra la factura, paga con el checkout y copia el enlace público", async () => {
    getActivation.mockResolvedValue(
      view({
        state: "pending_payment",
        pending_invoice: {
          invoice_id: "inv-9",
          number: "AXI-000123",
          amount_cents: 22_190_000,
          currency: "COP",
          due_at: "2026-09-19T12:00:00.000Z",
        },
      }),
    );
    issueInvoiceLink.mockResolvedValue({
      url: "https://pay.axi.test/pay/inv-9/tok",
      expires_at: "2026-09-19T12:00:00.000Z",
    });
    Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } });
    render(<ActivationCard canPay />);

    await waitFor(() =>
      expect(screen.getByText("Tu factura de activación está lista.")).toBeInTheDocument(),
    );
    expect(screen.getByText(/Factura AXI-000123/)).toBeInTheDocument();
    expect(screen.getByText(money(22_190_000))).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pagar ahora" }));
    expect(start).toHaveBeenCalledWith("inv-9");

    fireEvent.click(screen.getByRole("button", { name: /Copiar enlace de pago/ }));
    await waitFor(() => expect(issueInvoiceLink).toHaveBeenCalledWith("inv-9"));
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })),
    );
  });
});

describe("ActivationCard — sin oferta o combinación no soportada", () => {
  it("sin oferta manda a precios y a ventas", async () => {
    getActivation.mockResolvedValue(view({ state: "trial_no_offer", quote_now: null, quote_saved: null }));
    render(<ActivationCard canPay />);
    await waitFor(() => expect(screen.getByText("Elige tu plan.")).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Ver paquetes y precios" })).toHaveAttribute(
      "href",
      "/precios",
    );
    expect(screen.getByRole("link", { name: "Hablar con ventas" })).toBeInTheDocument();
  });

  it("un tenant de pago sin término no ve la tarjeta aunque el estado llegue como trial_no_offer", async () => {
    getActivation.mockResolvedValue(
      view({ state: "trial_no_offer", trial_ends_at: null, quote_now: null, quote_saved: null }),
    );
    const { container } = render(<ActivationCard canPay />);
    await waitFor(() => expect(useActivationStore.getState().status).toBe("ready"));
    expect(container).toBeEmptyDOMElement();
  });

  it("en pendiente de pago sin billing:pay los botones se deshabilitan y se explica", async () => {
    getActivation.mockResolvedValue(
      view({
        state: "pending_payment",
        pending_invoice: {
          invoice_id: "inv-9",
          number: "AXI-000123",
          amount_cents: 22_190_000,
          currency: "COP",
          due_at: "2026-09-19T12:00:00.000Z",
        },
      }),
    );
    render(<ActivationCard canPay={false} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Pagar ahora" })).toBeDisabled());
    expect(screen.getByText(/Solo quien administra la facturación puede pagar/)).toBeInTheDocument();
  });

  it("varios módulos sueltos: solo ventas", async () => {
    getActivation.mockResolvedValue(view({ state: "unsupported", quote_now: null }));
    render(<ActivationCard canPay />);
    await waitFor(() =>
      expect(screen.getByText("Activa tu combinación con nosotros.")).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: "Ver paquetes y precios" })).not.toBeInTheDocument();
  });
});
