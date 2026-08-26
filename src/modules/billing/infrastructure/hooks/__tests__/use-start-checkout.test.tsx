import { renderHook } from "@testing-library/react";
import { act } from "react";
import { HttpError } from "@/core/api/problem";
import { useStartCheckout } from "../use-start-checkout";

const createCheckoutSession = jest.fn();
const createPublicCheckoutSession = jest.fn();
const showAlert = jest.fn();

jest.mock("@/modules/billing/infrastructure/services/billing-service.adapter", () => ({
  createCheckoutSession: (...args: unknown[]) => createCheckoutSession(...args),
  createPublicCheckoutSession: (...args: unknown[]) => createPublicCheckoutSession(...args),
}));

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

const assign = jest.fn();

beforeAll(() => {
  // `window.location` es de solo lectura en jsdom: se reemplaza por un doble
  // para poder observar la redirección sin navegar de verdad.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { origin: "https://app.axi.co", assign },
  });
});

const SESSION = {
  reference: "LIC-AXI-000042-1",
  amount_in_cents: 122_900_000,
  currency: "COP",
  signature: "firma-del-servidor",
  public_key: "pub_test_abc",
  expiration_time: null,
  redirect_url: null,
};

beforeEach(() => jest.clearAllMocks());

describe("useStartCheckout", () => {
  it("con sesión usa el endpoint autenticado y redirige a Wompi", async () => {
    createCheckoutSession.mockResolvedValue(SESSION);
    const { result } = renderHook(() => useStartCheckout());

    await act(async () => {
      await result.current.start("inv-1");
    });

    expect(createCheckoutSession).toHaveBeenCalledWith("inv-1");
    expect(createPublicCheckoutSession).not.toHaveBeenCalled();

    const url = assign.mock.calls[0][0] as string;
    expect(url.startsWith("https://checkout.wompi.co/p/?")).toBe(true);
    // La firma del servidor viaja tal cual, y el nombre del parámetro conserva
    // los dos puntos.
    expect(url).toContain("signature:integrity=firma-del-servidor");
    expect(url).toContain(`redirect-url=${encodeURIComponent("https://app.axi.co/pay/return?invoice=inv-1")}`);
  });

  it("con token usa el endpoint PÚBLICO y arrastra el token al retorno", async () => {
    // Sin el token, la pantalla de confirmación no podría consultar el estado:
    // el endpoint autenticado no le sirve a un pagador anónimo.
    createPublicCheckoutSession.mockResolvedValue(SESSION);
    const { result } = renderHook(() => useStartCheckout());

    await act(async () => {
      await result.current.start("inv-1", "tok_abc");
    });

    expect(createPublicCheckoutSession).toHaveBeenCalledWith("inv-1", "tok_abc");
    expect(createCheckoutSession).not.toHaveBeenCalled();
    expect(assign.mock.calls[0][0]).toContain(
      encodeURIComponent("https://app.axi.co/pay/return?invoice=inv-1&token=tok_abc"),
    );
  });

  it("SIN firma no abre el checkout: generarla aquí exigiría el secreto de integridad", async () => {
    createCheckoutSession.mockResolvedValue({ ...SESSION, signature: "" });
    const { result } = renderHook(() => useStartCheckout());

    await act(async () => {
      await result.current.start("inv-1");
    });

    expect(assign).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(
      expect.objectContaining({ tone: "error", title: "No pudimos abrir el pago" }),
    );
  });

  it("un 502 de la pasarela NO se presenta como «tu pago falló» ni invita a reintentar", async () => {
    // Un timeout puede llegar DESPUÉS de que Wompi creara el cobro: decirle que
    // reintente acabaría en un pago doble.
    createCheckoutSession.mockRejectedValue(
      new HttpError({ status: 502, code: "billing/gateway_error", message: "" }),
    );
    const { result } = renderHook(() => useStartCheckout());

    await act(async () => {
      await result.current.start("inv-1");
    });

    expect(assign).not.toHaveBeenCalled();
    const alert = showAlert.mock.calls[0][0] as { description: string };
    expect(alert.description).toContain("no está disponible");
    expect(alert.description).toContain("no vuelvas a pagar");
    expect(alert.description).not.toMatch(/pago falló/i);
  });

  it("tras un fallo el botón vuelve a estar disponible", async () => {
    createCheckoutSession.mockRejectedValue(new Error("red caída"));
    const { result } = renderHook(() => useStartCheckout());

    await act(async () => {
      await result.current.start("inv-1");
    });

    expect(result.current.starting).toBe(false);
  });
});
