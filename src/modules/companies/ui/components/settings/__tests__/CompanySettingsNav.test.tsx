import { render, screen } from "@testing-library/react";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

import {
  CompanySettingsNav,
  companySettingsTabs,
} from "@/modules/companies/ui/components/settings/CompanySettingsNav";

describe("CompanySettingsNav", () => {
  beforeEach(() => {
    mockPathname.mockReturnValue("/settings/company");
  });

  it("General es exacto: en /settings/company/sucursales no queda activo", () => {
    mockPathname.mockReturnValue("/settings/company/sucursales");
    render(<CompanySettingsNav />);

    expect(screen.getByRole("link", { name: /Sucursales/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /General/ })).not.toHaveAttribute("aria-current");
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
    expect(companySettingsTabs().map((tab) => tab.href)).toEqual([
      "/settings/company",
      "/settings/company/sucursales",
      "/settings/company/funciones",
    ]);
  });
});
