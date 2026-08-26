import { render, screen, waitFor } from "@testing-library/react";
import type { BillingSummaryDTO } from "@/modules/billing/domain/account";
import { useBillingStore } from "@/modules/billing/infrastructure/stores/billing.store";
import { DunningBanner } from "../DunningBanner";

const getBillingSummary = jest.fn();
let permissions: string[] = ["billing:read"];

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getBillingSummary: () => getBillingSummary(),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({
    status: "authenticated",
    hasPermission: (code: string) => permissions.includes(code),
  }),
}));

function summary(over: Partial<BillingSummaryDTO> = {}): BillingSummaryDTO {
  return {
    account_status: "past_due",
    plan_code: "sbs",
    currency: "COP",
    cycle: null,
    next_invoice_estimate_cents: null,
    outstanding_cents: 122_900_000,
    open_invoices: 1,
    auto_charge: false,
    has_payment_source: false,
    grace_days: 5,
    // Venció hace 2 días ⇒ quedan 3 de gracia.
    oldest_due_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  permissions = ["billing:read"];
  useBillingStore.setState({ status: "idle", summary: null, error: null });
});

describe("DunningBanner", () => {
  it("avisa con el plazo y el saldo cuando la cuenta está en mora", async () => {
    getBillingSummary.mockResolvedValue(summary());
    render(<DunningBanner />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toContain("3 días");
    expect(alert.textContent).toContain("se suspenda el servicio");
    expect(screen.getByRole("link", { name: "Pagar ahora" })).toBeInTheDocument();
  });

  it("NO pide el resumen sin `billing:read`", async () => {
    // Monta en TODAS las páginas del panel: pedirlo a supervisor u operator
    // —que no tienen ningún permiso del slice a propósito— sería un 403 en
    // cada pantalla que abran.
    permissions = [];
    render(<DunningBanner />);

    await waitFor(() => expect(getBillingSummary).not.toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no pinta nada con la cuenta al día", async () => {
    getBillingSummary.mockResolvedValue(summary({ account_status: "current" }));
    render(<DunningBanner />);

    await waitFor(() => expect(getBillingSummary).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tampoco con un tenant en prueba: `account_status: null` no es mora", async () => {
    getBillingSummary.mockResolvedValue(summary({ account_status: null }));
    render(<DunningBanner />);

    await waitFor(() => expect(getBillingSummary).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("sin vencimiento avisa de la deuda pero NO inventa un plazo", async () => {
    getBillingSummary.mockResolvedValue(summary({ oldest_due_at: null }));
    render(<DunningBanner />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toContain("Tienes un pago vencido");
    expect(alert.textContent).not.toMatch(/\d+ días antes/);
  });

  it("un fallo del resumen NO rompe el shell del panel", async () => {
    getBillingSummary.mockRejectedValue(new Error("backend caído"));
    render(<DunningBanner />);

    await waitFor(() => expect(getBillingSummary).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("usa el tono warning y jamás el coral de marca: el coral es acción, no peligro", async () => {
    getBillingSummary.mockResolvedValue(summary());
    render(<DunningBanner />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.className).toContain("bg-warning/10");
    expect(alert.className).not.toContain("bg-destructive");
    expect(alert.className).not.toContain("bg-brand");
  });

  it("con varias facturas abiertas lo dice, en vez de hablar de una sola", async () => {
    getBillingSummary.mockResolvedValue(summary({ open_invoices: 3 }));
    render(<DunningBanner />);

    const alert = await waitFor(() => screen.getByRole("alert"));
    expect(alert.textContent).toContain("3 facturas");
  });
});
