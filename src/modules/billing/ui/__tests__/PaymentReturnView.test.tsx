import { render, screen } from "@testing-library/react";
import { PaymentReturnView } from "../PaymentReturnView";

const searchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

/** El socket no interviene en estas pruebas: el desenlace lo decide el poll. */
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: () => undefined,
}));

const getInvoice = jest.fn();
const getPublicInvoice = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  getInvoice: (...args: unknown[]) => getInvoice(...args),
  getPublicInvoice: (...args: unknown[]) => getPublicInvoice(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  searchParams.forEach((_, key) => searchParams.delete(key));
});

describe("PaymentReturnView", () => {
  it("al llegar NUNCA dice que el pago está confirmado", () => {
    // El redirect es client-side, no está firmado y es manipulable. La verdad
    // del pago la establece el webhook que Wompi le manda al servidor.
    searchParams.set("invoice", "inv-1");
    render(<PaymentReturnView />);

    expect(screen.getByText("Estamos confirmando tu pago")).toBeInTheDocument();
    expect(screen.queryByText(/pago confirmado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/quedó aplicado/i)).not.toBeInTheDocument();
  });

  it("explica que PSE y efectivo tardan, en vez de dejar un spinner mudo", () => {
    searchParams.set("invoice", "inv-1");
    render(<PaymentReturnView />);

    const hint = screen.getByText(/PSE/);
    expect(hint.textContent).toContain("24 horas");
    expect(hint.textContent).toContain("72");
    // Y le dice explícitamente que no vuelva a pagar: un cobro que salió se
    // aplicará solo, y reintentar acabaría en un pago doble.
    expect(hint.textContent).toContain("No vuelvas a pagar");
  });

  it("sin la referencia de la factura lo dice, y avisa de no pagar dos veces", () => {
    render(<PaymentReturnView />);

    expect(screen.getByText("No sabemos qué pago confirmar")).toBeInTheDocument();
    expect(screen.getByText(/no vuelvas a pagar/i)).toBeInTheDocument();
    expect(getInvoice).not.toHaveBeenCalled();
  });

  it("con sesión pregunta por el endpoint AUTENTICADO", () => {
    searchParams.set("invoice", "inv-1");
    render(<PaymentReturnView />);

    // El poll arranca con retardo, así que aquí solo se comprueba que no se
    // eligió el camino público (que exigiría un token que no hay).
    expect(getPublicInvoice).not.toHaveBeenCalled();
  });

  it("con token va por el endpoint PÚBLICO: un pagador anónimo no tiene socket", () => {
    searchParams.set("invoice", "inv-1");
    searchParams.set("token", "tok_abc");
    render(<PaymentReturnView />);

    expect(getInvoice).not.toHaveBeenCalled();
    // Sigue mostrando el mismo mensaje honesto de confirmación en curso.
    expect(screen.getByText("Estamos confirmando tu pago")).toBeInTheDocument();
  });

  it("el indicador de carga es accesible y respeta prefers-reduced-motion", () => {
    searchParams.set("invoice", "inv-1");
    render(<PaymentReturnView />);

    const spinner = screen.getByRole("status", { name: "Confirmando el pago" });
    expect(spinner.className).toContain("motion-reduce:");
  });
});
