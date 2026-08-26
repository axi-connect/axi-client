import { render, screen } from "@testing-library/react";
import { formatMoney } from "@/core/lib/format";
import type { InvoiceDetailDTO } from "@/modules/billing/domain/invoice";
import { InvoiceDetail } from "../InvoiceDetail";

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal: jest.fn(), closeModal: jest.fn() }),
}));

const startCheckout = jest.fn();

jest.mock("@/modules/billing/infrastructure/hooks/use-start-checkout", () => ({
  useStartCheckout: () => ({ start: startCheckout, starting: false }),
}));

/**
 * Normaliza los espacios duros que mete `Intl.NumberFormat` y colapsa el texto
 * repartido entre elementos. Sin esto las aserciones son frágiles a cómo el
 * componente parta el importe en JSX, que es un detalle de maquetación.
 */
function textOf(element: HTMLElement | null | undefined): string {
  return (element?.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** El importe tal como lo pinta la app, con los espacios normalizados. */
function money(cents: number): string {
  return formatMoney(cents).replace(/\s+/g, " ");
}

/**
 * El caso que rompe las implementaciones ingenuas de este dominio: un cliente
 * que practica ReteFuente gira MENOS que el total y la factura está saldada.
 */
function invoiceWithWithholding(): InvoiceDetailDTO {
  return {
    id: "018f0000-0000-7000-8000-000000000041",
    number: "AXI-000041",
    status: "paid",
    period_start: "2026-07-01T00:00:00.000Z",
    period_end: "2026-07-31T23:59:59.000Z",
    issued_at: "2026-08-01T00:00:00.000Z",
    due_at: "2026-08-06T00:00:00.000Z",
    total_cents: 111_900_000,
    paid_cents: 100_000_000,
    withholding_cents: 11_900_000,
    outstanding_cents: 0,
    currency: "COP",
    plan_code: "sbs",
    lines: [
      {
        kind: "subscription",
        description: "Licencia axi connect · plan sbs",
        quantity: 1,
        unit_amount_cents: 99_000_000,
        amount_cents: 99_000_000,
        tax_cents: 0,
      },
      {
        kind: "adjustment",
        description: "Capacitación al equipo",
        quantity: 1,
        unit_amount_cents: 10_000_000,
        amount_cents: 10_000_000,
        tax_cents: 1_900_000,
      },
      {
        kind: "credit",
        description: "Nota de crédito · incidencia del 12 de agosto",
        quantity: 1,
        unit_amount_cents: 8_600_000,
        amount_cents: 8_600_000,
        tax_cents: 0,
      },
    ],
  };
}

describe("InvoiceDetail", () => {
  it("muestra la retención como línea PROPIA, no la esconde", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    // Es lo que explica por qué el cliente giró menos que el total sin deber nada.
    const label = screen.getByText("Retención en la fuente");
    expect(textOf(label.parentElement)).toContain(`− ${money(11_900_000)}`);
  });

  it("«falta por pagar» sale de outstanding_cents, no de total − pagado", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    // total − pagado daría $ 119.000 de deuda a quien pagó bien.
    const label = screen.getByText("Falta por pagar");
    expect(textOf(label.parentElement)).toContain(money(0));
    expect(textOf(label.parentElement)).not.toContain(money(11_900_000));
  });

  it("los impuestos se suman LÍNEA A LÍNEA, no con un porcentaje del total", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    // Una sola línea gravada al 19 % entre dos excluidas.
    const taxes = screen.getByText("Impuestos");
    expect(textOf(taxes.parentElement)).toContain(money(1_900_000));
  });

  it("la nota de crédito resta y se pinta con signo", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    const line = screen.getByText(/incidencia del 12 de agosto/);
    expect(textOf(line.closest("li"))).toContain(`− ${money(8_600_000)}`);
  });

  it("una factura saldada NO ofrece pagar", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    expect(screen.queryByRole("button", { name: /^Pagar/ })).not.toBeInTheDocument();
  });

  it("con saldo pendiente ofrece pagar SOLO lo que falta", () => {
    const invoice = {
      ...invoiceWithWithholding(),
      status: "partially_paid" as const,
      outstanding_cents: 11_000_000,
    };
    render(<InvoiceDetail invoice={invoice} />);

    // El total son $1.119.000, pero cobrar eso sería cobrarle de nuevo lo que
    // ya giró y lo que retuvo.
    const pay = screen.getByRole("button", { name: /^Pagar/ });
    expect(textOf(pay)).toBe(`Pagar ${money(11_000_000)}`);
    expect(textOf(pay)).not.toContain(money(111_900_000));
  });

  it("avisa de que emitir un enlace nuevo invalida el anterior", () => {
    render(<InvoiceDetail invoice={invoiceWithWithholding()} />);

    expect(screen.getByText(/invalida el anterior/)).toBeInTheDocument();
  });

  it("sin impuestos declara la exclusión a nivel de DOCUMENTO", () => {
    const invoice = invoiceWithWithholding();
    invoice.lines = [invoice.lines[0]];
    render(<InvoiceDetail invoice={invoice} />);

    expect(screen.getByText(/excluida de IVA/)).toBeInTheDocument();
    // Y nunca lo llama factura electrónica: legalmente todavía no lo es.
    expect(screen.getByText(/todavía no/)).toBeInTheDocument();
  });
});
