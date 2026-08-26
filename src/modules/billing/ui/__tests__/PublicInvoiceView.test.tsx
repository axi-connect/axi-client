import { render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { formatMoney } from "@/core/lib/format";
import { PublicInvoiceView } from "../PublicInvoiceView";

const getPublicInvoice = jest.fn();
const startCheckout = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getPublicInvoice: (...args: unknown[]) => getPublicInvoice(...args),
}));

jest.mock("@/modules/billing/infrastructure/hooks/use-start-checkout", () => ({
  useStartCheckout: () => ({ start: startCheckout, starting: false }),
}));

const INVOICE = {
  number: "AXI-000042",
  period_start: "2026-08-01T00:00:00.000Z",
  period_end: "2026-08-31T23:59:59.000Z",
  due_at: "2026-09-06T00:00:00.000Z",
  amount_cents: 122_900_000,
  currency: "COP",
  status: "open",
  payable: true,
};

function problem(code: string, status: number): HttpError {
  return new HttpError({ status, code, message: code });
}

beforeEach(() => jest.clearAllMocks());

describe("PublicInvoiceView", () => {
  it("es mínima: NO expone razón social, NIT ni desglose del tenant", async () => {
    // Quien tiene el enlace puede ser el contador externo o alguien a quien se
    // lo reenviaron. Añadirle datos que la API no da sería una fuga.
    getPublicInvoice.mockResolvedValue(INVOICE);
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("AXI-000042")).toBeInTheDocument());
    expect(screen.queryByText(/NIT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Razón social/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Subtotal/i)).not.toBeInTheDocument();
  });

  it("no enlaza al panel: a esta página llega gente sin sesión", async () => {
    getPublicInvoice.mockResolvedValue(INVOICE);
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("AXI-000042")).toBeInTheDocument());
    for (const link of screen.queryAllByRole("link")) {
      expect(link.getAttribute("href") ?? "").not.toContain("/billing");
    }
  });

  it("`payable` es la ÚNICA señal que habilita el pago", async () => {
    // Una factura `partially_paid` con retención registrada tiene saldo cero y
    // NO es pagable: deducirlo del status la ofrecería a cobro de nuevo.
    getPublicInvoice.mockResolvedValue({
      ...INVOICE,
      status: "partially_paid",
      amount_cents: 0,
      payable: false,
    });
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() =>
      expect(screen.getByText(/ya no tiene saldo pendiente/)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /^Pagar/ })).not.toBeInTheDocument();
  });

  it("cobra lo que FALTA, no el total de la factura", async () => {
    getPublicInvoice.mockResolvedValue(INVOICE);
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    const pay = await screen.findByRole("button", { name: /^Pagar/ });
    expect(pay.textContent?.replace(/\s+/g, " ")).toContain(
      formatMoney(122_900_000).replace(/\s+/g, " "),
    );
  });

  it("un enlace caducado NO se presenta como culpa del usuario", async () => {
    getPublicInvoice.mockRejectedValue(problem("billing/link_expired", 410));
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("Este enlace caducó")).toBeInTheDocument());
    expect(screen.getByText(/pídele uno nuevo/i)).toBeInTheDocument();
  });

  it("un token inválido da mensaje GENÉRICO: no confirma si la factura existe", async () => {
    // Decir «esa factura no existe» le confirmaría qué ids existen a quien esté
    // probando tokens al azar.
    getPublicInvoice.mockRejectedValue(problem("auth/unauthorized", 401));
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() =>
      expect(screen.getByText("Este enlace no es válido")).toBeInTheDocument(),
    );
    expect(screen.queryByText(/no existe/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AXI-/)).not.toBeInTheDocument();
  });

  it("una factura ya saldada se dice con alivio, no con error", async () => {
    getPublicInvoice.mockRejectedValue(problem("billing/invoice_not_payable", 409));
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() =>
      expect(screen.getByText("Esta factura ya está saldada")).toBeInTheDocument(),
    );
    expect(screen.getByText(/No hace falta que hagas nada/)).toBeInTheDocument();
  });

  it("pide la factura UNA vez: el endpoint limita a 10 req/min por IP", async () => {
    getPublicInvoice.mockResolvedValue(INVOICE);
    render(<PublicInvoiceView invoiceId="inv-1" token="tok" />);

    await waitFor(() => expect(screen.getByText("AXI-000042")).toBeInTheDocument());
    expect(getPublicInvoice).toHaveBeenCalledTimes(1);
    expect(getPublicInvoice).toHaveBeenCalledWith("inv-1", "tok");
  });
});
