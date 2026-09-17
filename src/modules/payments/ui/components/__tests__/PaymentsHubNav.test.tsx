import { render, screen } from "@testing-library/react";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockFeatures = jest.fn<{ loaded: boolean; hasFeature: (code: string) => boolean }, []>();
jest.mock("@/shared/auth/features.hooks", () => ({ useFeatures: () => mockFeatures() }));

import { PaymentsHubNav, paymentsHubTabs } from "@/modules/payments/ui/components/PaymentsHubNav";

describe("PaymentsHubNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/settings/payments");
  });

  it("«Medios» está siempre: es la pestaña que no depende de ninguna función", () => {
    mockFeatures.mockReturnValue({ loaded: true, hasFeature: () => false });
    render(<PaymentsHubNav />);

    expect(screen.getByRole("link", { name: /Medios/ })).toHaveAttribute("href", "/settings/payments");
    expect(screen.queryByRole("link", { name: /Moneda y TRM/ })).toBeNull();
  });

  it("«Moneda y TRM» aparece solo con la función fx_quotes", () => {
    mockFeatures.mockReturnValue({ loaded: true, hasFeature: (code) => code === "fx_quotes" });
    render(<PaymentsHubNav />);

    expect(screen.getByRole("link", { name: /Moneda y TRM/ })).toHaveAttribute(
      "href",
      "/settings/payments/moneda",
    );
  });

  it("mientras las funciones cargan solo se ofrece Medios: nunca pintar-y-quitar", () => {
    mockFeatures.mockReturnValue({ loaded: false, hasFeature: () => true });
    render(<PaymentsHubNav />);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("«Plan de pagos» se ofrece desde F4, que es cuando existe su pantalla", () => {
    const hrefs = paymentsHubTabs(() => true, true).map((tab) => tab.href);
    expect(hrefs).toEqual([
      "/settings/payments",
      "/settings/payments/plan",
      "/settings/payments/moneda",
    ]);
  });

  it("«Documentos» sigue sin ofrecerse: su pantalla llega en F7", () => {
    // El interruptor de entrega existe para esto — una pestaña que lleva a una
    // ruta que no existe es peor que no tenerla.
    expect(paymentsHubTabs(() => true, true).map((tab) => tab.href)).not.toContain(
      "/settings/payments/documentos",
    );
  });

  it("sin la función de planes no aparece la pestaña, aunque la pantalla exista", () => {
    const hrefs = paymentsHubTabs((code) => code !== "payment_plans", true).map((tab) => tab.href);
    expect(hrefs).not.toContain("/settings/payments/plan");
  });
});
