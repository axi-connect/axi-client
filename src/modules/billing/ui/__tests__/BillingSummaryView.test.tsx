import { render, screen, waitFor } from "@testing-library/react";
import { formatMoney } from "@/core/lib/format";
import type { BillingSummaryDTO } from "@/modules/billing/domain/account";
import { useBillingStore } from "@/modules/billing/infrastructure/stores/billing.store";
import { BillingSummaryView } from "../BillingSummaryView";

const getBillingSummary = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getBillingSummary: () => getBillingSummary(),
}));

// El socket arrastraría `useSocket` entero y esta vista no depende de él para
// pintar: se dobla y se prueba lo que se ve.
jest.mock("@/modules/billing/infrastructure/realtime/use-billing-socket", () => ({
  useBillingSocket: () => ({ connected: false }),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ status: "authenticated", hasPermission: () => true }),
}));

/**
 * Importe como lo va a ver `getByText`. `formatMoney` mete un espacio DURO y el
 * normalizador de Testing Library lo colapsa a un espacio normal, así que el
 * literal salido de `formatMoney` NO casa: hay que normalizar los dos lados
 * (mismo helper que `InvoiceDetail.test.tsx`).
 */
function money(cents: number): string {
  return formatMoney(cents, "COP").replace(/\s+/g, " ");
}

function summary(over: Partial<BillingSummaryDTO> = {}): BillingSummaryDTO {
  return {
    account_status: "current",
    plan_code: "sbs",
    currency: "COP",
    cycle: { period_start: "2026-08-24T00:00:00Z", period_end: "2026-09-24T00:00:00Z" },
    next_invoice_estimate_cents: 108_600_000,
    outstanding_cents: 0,
    open_invoices: 0,
    auto_charge: false,
    has_payment_source: false,
    grace_days: 5,
    oldest_due_at: null,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useBillingStore.setState({ status: "idle", summary: null, error: null });
});

describe("BillingSummaryView — el tiquete de la estimación", () => {
  it("pinta el importe estimado con el formato de dinero del proyecto", async () => {
    getBillingSummary.mockResolvedValue(summary());
    render(<BillingSummaryView />);

    await waitFor(() => expect(screen.getByText(money(108_600_000))).toBeInTheDocument());
  });

  it("con estimación enciende el tiquete; el cometa y el tinte cuelgan de esa clase", async () => {
    getBillingSummary.mockResolvedValue(summary());
    const { container } = render(<BillingSummaryView />);

    // Es lo único del apartado visual que jsdom puede afirmar de verdad, y es
    // la bisagra entre el estado y el CSS: `--live` es lo que activa el tinte
    // ámbar y el anillo animado en `globals.css`.
    await waitFor(() =>
      expect(container.querySelector(".ticket-surface--live")).not.toBeNull(),
    );
  });

  it("sin estimación NO promete nada: ni cifra, ni tinte, ni cometa", async () => {
    getBillingSummary.mockResolvedValue(summary({ next_invoice_estimate_cents: null }));
    const { container } = render(<BillingSummaryView />);

    await waitFor(() =>
      expect(screen.getByText("Sin estimación disponible")).toBeInTheDocument(),
    );

    // Acotado AL TIQUETE a propósito: `$ 0` es una respuesta legítima en la tile
    // de «Saldo pendiente» de al lado, y buscarlo en todo el documento
    // confundiría las dos cosas. Lo que no puede pasar es que la ESTIMACIÓN
    // ausente se pinte como un cero: `null` es «no lo sabemos» y cero es «no vas
    // a pagar nada», que es una promesa.
    const ticket = container.querySelector(".ticket-surface");
    expect(ticket).not.toBeNull();
    expect(ticket?.textContent?.replace(/\s+/g, " ")).not.toContain(money(0));

    expect(container.querySelector(".ticket-surface--live")).toBeNull();
    // La FORMA se queda: es identidad del módulo, no un estado del dato.
  });

  it("sin ciclo el talón dice que no lo hay, pero sigue en su sitio", async () => {
    getBillingSummary.mockResolvedValue(summary({ cycle: null }));
    render(<BillingSummaryView />);

    // El talón se renderiza SIEMPRE: la muesca está anclada a su ancho, así que
    // si desapareciera quedaría cortando el aire.
    await waitFor(() => expect(screen.getByText("Sin ciclo abierto")).toBeInTheDocument());
    expect(screen.getByText("Corte")).toBeInTheDocument();
  });

  it("cuenta los días que faltan para el corte", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-12T00:00:00Z"));
    getBillingSummary.mockResolvedValue(summary());

    render(<BillingSummaryView />);

    await waitFor(() => expect(screen.getByText("En 12 días")).toBeInTheDocument());
    jest.useRealTimers();
  });

  it("el tiquete NO es un control: no lleva a ninguna parte", async () => {
    // Un tiquete invita a tocarlo, así que la tentación de colgarle un destino
    // es real. Se decidió que es informativo: un CTA escondido en la tarjeta
    // del dinero se pulsa sin querer.
    getBillingSummary.mockResolvedValue(summary());
    const { container } = render(<BillingSummaryView />);

    await waitFor(() =>
      expect(container.querySelector(".ticket-surface")).not.toBeNull(),
    );
    const ticket = container.querySelector(".ticket-surface");
    expect(ticket?.querySelector("a")).toBeNull();
    expect(ticket?.querySelector("button")).toBeNull();
  });
});
