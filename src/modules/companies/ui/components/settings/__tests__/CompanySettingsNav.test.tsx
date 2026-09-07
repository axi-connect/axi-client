import { render, screen } from "@testing-library/react";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockEntitlements = jest.fn<{ loaded: boolean; hasCapability: (c: string) => boolean }, []>();
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => mockEntitlements(),
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
    mockEntitlements.mockReturnValue({ loaded: true, hasCapability: () => true });
    render(<CompanySettingsNav />);

    expect(screen.getByRole("link", { name: /Sucursales/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /General/ })).not.toHaveAttribute("aria-current");
  });

  it("«Medios de pago» solo aparece con la capacidad sales ya cargada (sin pintar-y-quitar)", () => {
    mockEntitlements.mockReturnValue({ loaded: false, hasCapability: () => true });
    const { rerender } = render(<CompanySettingsNav />);
    expect(screen.queryByRole("link", { name: /Medios de pago/ })).toBeNull();

    mockEntitlements.mockReturnValue({ loaded: true, hasCapability: (c) => c === "sales" });
    rerender(<CompanySettingsNav />);
    expect(screen.getByRole("link", { name: /Medios de pago/ })).toHaveAttribute(
      "href",
      "/settings/company/pagos",
    );
  });

  it("sin la capacidad no hay pestaña de pagos", () => {
    mockEntitlements.mockReturnValue({ loaded: true, hasCapability: () => false });
    render(<CompanySettingsNav />);
    expect(screen.queryByRole("link", { name: /Medios de pago/ })).toBeNull();
    expect(companySettingsTabs(false).map((t) => t.href)).toEqual([
      "/settings/company",
      "/settings/company/sucursales",
    ]);
  });
});
