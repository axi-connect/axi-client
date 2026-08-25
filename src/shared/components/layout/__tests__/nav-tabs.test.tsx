import { render, screen } from "@testing-library/react";
import { Users } from "lucide-react";

import { NavTabs, isNavTabActive } from "@/shared/components/layout/nav-tabs";

const mockPathname = jest.fn<string, []>();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const ITEMS = [
  { href: "/catalog/products", label: "Productos", icon: Users },
  { href: "/catalog/categories", label: "Categorías" },
  { href: "/catalog/catalogs", label: "Catálogos", count: 3 },
];

describe("isNavTabActive", () => {
  it("acierta en la ruta exacta y en sus sub-rutas", () => {
    expect(isNavTabActive("/catalog/products", "/catalog/products")).toBe(true);
    // El caso que motivó la regla: crear un producto no debe apagar «Productos».
    expect(isNavTabActive("/catalog/products/create", "/catalog/products")).toBe(true);
    expect(isNavTabActive("/catalog/products/42/edit", "/catalog/products")).toBe(true);
  });

  it("no se activa por prefijo de cadena de otro segmento", () => {
    // `startsWith` a secas activaría `/dashboard` en `/dashboard-legacy`.
    expect(isNavTabActive("/dashboard-legacy", "/dashboard")).toBe(false);
    expect(isNavTabActive("/catalog/product-types", "/catalog/products")).toBe(false);
  });
});

describe("NavTabs", () => {
  it("es navegación, no pestañas: nav + links + aria-current", () => {
    mockPathname.mockReturnValue("/catalog/products");
    render(<NavTabs items={ITEMS} label="Secciones del catálogo" />);

    expect(screen.getByRole("navigation", { name: "Secciones del catálogo" })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    // Cambian de ruta: anunciarlas como `tab` mentiría al lector de pantalla.
    expect(screen.queryAllByRole("tab")).toHaveLength(0);

    expect(screen.getByRole("link", { name: /Productos/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /Categorías/ })).not.toHaveAttribute("aria-current");
  });

  it("mantiene el activo en una sub-ruta", () => {
    mockPathname.mockReturnValue("/catalog/products/create");
    render(<NavTabs items={ITEMS} label="Secciones del catálogo" />);

    expect(screen.getByRole("link", { name: /Productos/ })).toHaveAttribute("aria-current", "page");
  });

  it("pinta el contador del ítem que lo trae", () => {
    mockPathname.mockReturnValue("/catalog/products");
    render(<NavTabs items={ITEMS} label="Secciones del catálogo" />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("monta una pastilla decorativa, fuera del árbol accesible", () => {
    mockPathname.mockReturnValue("/catalog/products");
    const { container } = render(<NavTabs items={ITEMS} label="Secciones del catálogo" />);

    const pill = container.querySelector('[data-slot="segmented-pill"]');
    expect(pill).not.toBeNull();
    expect(pill).toHaveAttribute("aria-hidden", "true");
  });
});
