import { render, screen } from "@testing-library/react";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname() }));

const mockFeatures = jest.fn<
  { loaded: boolean; hasFeature: (code: string) => boolean },
  []
>();
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => mockFeatures(),
}));

import {
  PaymentsHubNav,
  paymentsHubTabs,
} from "@/modules/payments/ui/components/PaymentsHubNav";

describe("PaymentsHubNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/settings/payments");
  });

  it("«Medios» está siempre: es la pestaña que no depende de ninguna función", () => {
    mockFeatures.mockReturnValue({ loaded: true, hasFeature: () => false });
    render(<PaymentsHubNav />);

    expect(screen.getByRole("link", { name: /Medios/ })).toHaveAttribute(
      "href",
      "/settings/payments",
    );
    expect(screen.queryByRole("link", { name: /Moneda y TRM/ })).toBeNull();
  });

  it("«Moneda y TRM» aparece solo con la función fx_quotes", () => {
    mockFeatures.mockReturnValue({
      loaded: true,
      hasFeature: (code) => code === "fx_quotes",
    });
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

  it("«Plan de pagos» y «Recordatorios» se ofrecen desde F4 y F5", () => {
    const hrefs = paymentsHubTabs(() => true, true).map((tab) => tab.href);
    expect(hrefs).toEqual([
      "/settings/payments",
      "/settings/payments/plan",
      "/settings/payments/recordatorios",
      "/settings/payments/moneda",
    ]);
  });

  it("«Documentos» NO es pestaña de Pagos: vive en Mi empresa (F7, decisión del dueño)", () => {
    // Los documentos son el papel de la empresa y los consume cualquier
    // proceso; ni con la función encendida aparecen aquí.
    expect(
      paymentsHubTabs(() => true, true).map((tab) => tab.href),
    ).not.toContain("/settings/payments/documentos");
  });

  it("sin la función de planes no aparece la pestaña, aunque la pantalla exista", () => {
    const hrefs = paymentsHubTabs((code) => code !== "payment_plans", true).map(
      (tab) => tab.href,
    );
    expect(hrefs).not.toContain("/settings/payments/plan");
  });

  it("«Recordatorios» es pestaña propia y cuelga de `collections`", () => {
    // Aparte de «Plan de pagos» a propósito: esa pestaña es el TRATO, que cada
    // pedido congela al confirmarlo, y esta la OPERACIÓN, que se lee viva.
    const conCobranza = paymentsHubTabs(
      (code) => code === "payment_plans" || code === "collections",
      true,
    );
    expect(conCobranza.map((tab) => tab.label)).toEqual([
      "Medios",
      "Plan de pagos",
      "Recordatorios",
    ]);

    // Un negocio con plan de pagos pero sin cobranza no persigue a nadie: no
    // tiene por qué ver una pantalla de recordatorios que no va a usar.
    expect(
      paymentsHubTabs((code) => code === "payment_plans", true).map(
        (tab) => tab.label,
      ),
    ).toEqual(["Medios", "Plan de pagos"]);
  });
});
