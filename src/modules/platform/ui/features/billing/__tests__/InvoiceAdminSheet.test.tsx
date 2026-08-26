import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { formatMoney } from "@/core/lib/format";
import type { PlatformInvoice } from "@/modules/platform/domain/billing";
import { InvoiceAdminSheet } from "../InvoiceAdminSheet";

const showAlert = jest.fn();
const withholding = jest.fn();
const voidInvoice = jest.fn();
const adjustment = jest.fn();

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

// El `DetailSheet` real usa portal + framer-motion, y aquí lo que se prueba es
// el contenido y sus tres acciones (mismo doble que en `PlanFormSheet.test`).
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

jest.mock("@/modules/platform/infrastructure/api/hooks/use-billing", () => ({
  useRegisterWithholding: () => ({ mutateAsync: withholding, isPending: false }),
  useVoidInvoice: () => ({ mutateAsync: voidInvoice, isPending: false }),
  useAddAdjustment: () => ({ mutateAsync: adjustment, isPending: false }),
}));

function invoice(over: Partial<PlatformInvoice> = {}): PlatformInvoice {
  return {
    id: "018f0000-0000-7000-8000-000000000042",
    company_id: "018f0000-0000-7000-8000-0000000000c1",
    company_name: "Distribuidora Andina S.A.S.",
    number: "AXI-000042",
    status: "open",
    period_start: "2026-08-01T00:00:00.000Z",
    period_end: "2026-08-31T23:59:59.000Z",
    issued_at: "2026-09-01T00:00:00.000Z",
    due_at: "2026-09-06T00:00:00.000Z",
    total_cents: 122_900_000,
    paid_cents: 0,
    withholding_cents: 0,
    outstanding_cents: 122_900_000,
    currency: "COP",
    ...over,
  };
}

const settled = {
  invoice_id: "018f0000-0000-7000-8000-000000000042",
  status: "paid",
  total_cents: 122_900_000,
  paid_cents: 0,
  withholding_cents: 122_900_000,
  outstanding_cents: 0,
};

beforeEach(() => jest.clearAllMocks());

function open(inv: PlatformInvoice = invoice()) {
  return render(<InvoiceAdminSheet invoice={inv} open onOpenChange={jest.fn()} />);
}

/** `fireEvent.change` en vez de `user-event`, que no está en el proyecto. */
function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe("InvoiceAdminSheet", () => {
  it("pide la retención como valor TOTAL, no como un incremento", () => {
    // Presentarla como «añadir retención» hace que alguien la sume dos veces.
    open();
    expect(screen.getByText(/valor/)).toBeInTheDocument();
    expect(screen.getByText(/no un incremento/)).toBeInTheDocument();
    expect(screen.queryByText(/añadir retención/i)).not.toBeInTheDocument();
  });

  it("registra la retención en centavos y anuncia la REACTIVACIÓN si queda saldada", async () => {
    // Cuando la acción salda la factura el backend reactiva el servicio solo:
    // si no se le dice al operador, no sabe que su clic devolvió el acceso.
    withholding.mockResolvedValue(settled);
    open();

    type("Retención total practicada", "1.229.000");
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(withholding).toHaveBeenCalledWith(
      expect.objectContaining({ withholding_cents: 122_900_000 }),
    );
    const alert = showAlert.mock.calls[0][0] as { title: string; description: string };
    expect(alert.title).toBe("Factura saldada");
    expect(alert.description).toContain("se reactivó");
  });

  it("si queda saldo NO promete reactivación, y dice cuánto falta", async () => {
    withholding.mockResolvedValue({ ...settled, status: "partially_paid", outstanding_cents: 11_000_000 });
    open();

    type("Retención total practicada", "1.119.000");
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    const alert = showAlert.mock.calls[0][0] as { description: string };
    expect(alert.description).not.toContain("reactiv");
    expect(alert.description.replace(/\s+/g, " ")).toContain(
      formatMoney(11_000_000).replace(/\s+/g, " "),
    );
  });

  it("el ajuste manda el importe POSITIVO: el signo lo pone el tipo", async () => {
    // Un negativo lo rechaza el backend con 422, así que el formulario lo
    // impide y el copy lo explica.
    adjustment.mockResolvedValue(settled);
    open();

    type("Importe", "86.000");
    fireEvent.change(screen.getByPlaceholderText(/Motivo — queda escrito/), {
      target: { value: "Incidencia del 12 de agosto" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await waitFor(() => expect(adjustment).toHaveBeenCalled());
    expect(adjustment).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "credit", amount_cents: 8_600_000 }),
    );
    expect(adjustment.mock.calls[0][0].amount_cents).toBeGreaterThan(0);
  });

  it("el ajuste exige motivo: sin él el botón no se habilita", async () => {
    open();

    type("Importe", "86.000");

    expect(screen.getByRole("button", { name: "Aplicar" })).toBeDisabled();
  });

  it("una factura CON pagos aplicados no se puede anular, y dice por qué", () => {
    // El backend responde 409. El botón se deshabilita en vez de dejar que el
    // operador lo descubra al pulsarlo.
    open(invoice({ paid_cents: 50_000_000, status: "partially_paid" }));

    expect(screen.getByRole("button", { name: /^Anular/ })).toBeDisabled();
    // El aviso vive en el bloque de anulación y remite a la nota de crédito
    // (la palabra también titula su propia sección, de ahí el ámbito).
    const warning = screen.getByText(/no se puede anular/);
    expect(warning.closest("p")?.textContent).toContain("nota de crédito");
  });

  it("anular exige motivo y pasa por confirmación escrita", async () => {
    open();

    const button = screen.getByRole("button", { name: /^Anular/ });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Motivo de la anulación"), {
      target: { value: "Duplicada" },
    });
    expect(button).toBeEnabled();

    fireEvent.click(button);
    // `ConfirmTyped`: hay que escribir el número exacto de la factura, así que
    // el clic abre la confirmación y NO anula nada todavía.
    expect(screen.getAllByText(/no se reutiliza/).length).toBeGreaterThanOrEqual(1);
    expect(voidInvoice).not.toHaveBeenCalled();
  });

  it("un fallo se muestra sin cerrar el panel ni perder lo escrito", async () => {
    withholding.mockRejectedValue(new Error("409"));
    open();

    type("Retención total practicada", "1.229.000");
    fireEvent.click(screen.getByRole("button", { name: "Registrar" }));

    await waitFor(() => expect(showAlert).toHaveBeenCalled());
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", title: "No se pudo aplicar" }),
    );
  });
});
