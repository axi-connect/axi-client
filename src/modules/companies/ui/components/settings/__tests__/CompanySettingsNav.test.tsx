import { render, screen } from "@testing-library/react";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockFeatures = {
  loaded: true,
  hasFeature: jest.fn<boolean, [string]>(() => false),
};
jest.mock("@/shared/auth/features.hooks", () => ({
  useFeatures: () => mockFeatures,
}));

import {
  CompanySettingsNav,
  companySettingsTabs,
} from "@/modules/companies/ui/components/settings/CompanySettingsNav";

describe("CompanySettingsNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/settings/company");
    mockFeatures.loaded = true;
    mockFeatures.hasFeature.mockImplementation(() => false);
  });

  it("General es exacto: en /settings/company/sucursales no queda activo", () => {
    mockPathname.mockReturnValue("/settings/company/sucursales");
    render(<CompanySettingsNav />);

    expect(screen.getByRole("link", { name: /Sucursales/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /General/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("«Funciones» está siempre: explica que falta el plan en vez de desaparecer", () => {
    mockPathname.mockReturnValue("/settings/company/funciones");
    render(<CompanySettingsNav />);

    const funciones = screen.getByRole("link", { name: /Funciones/ });
    expect(funciones).toHaveAttribute("href", "/settings/company/funciones");
    expect(funciones).toHaveAttribute("aria-current", "page");
  });

  it("«Medios de pago» ya no es pestaña de Mi empresa: se movió al hub Pagos", () => {
    render(<CompanySettingsNav />);
    expect(screen.queryByRole("link", { name: /Medios de pago/ })).toBeNull();
    expect(
      companySettingsTabs(() => false, true).map((tab) => tab.href),
    ).toEqual([
      "/settings/company",
      "/settings/company/sucursales",
      "/settings/company/funciones",
    ]);
  });

  it("«Documentos» (F7) aparece solo con la función encendida, y en Mi empresa — no en Pagos", () => {
    mockFeatures.hasFeature.mockImplementation((code) => code === "documents");
    render(<CompanySettingsNav />);
    expect(screen.getByRole("link", { name: /Documentos/ })).toHaveAttribute(
      "href",
      "/settings/company/documentos",
    );
  });

  it("sin la función, la pestaña no existe; y mientras las funciones cargan tampoco se pinta (no pintar-y-quitar)", () => {
    render(<CompanySettingsNav />);
    expect(screen.queryByRole("link", { name: /Documentos/ })).toBeNull();
    expect(
      companySettingsTabs(() => true, false).map((tab) => tab.href),
    ).not.toContain("/settings/company/documentos");
    expect(
      companySettingsTabs(() => true, true).map((tab) => tab.href),
    ).toContain("/settings/company/documentos");
  });
});
