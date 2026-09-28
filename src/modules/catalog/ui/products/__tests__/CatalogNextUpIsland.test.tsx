import { fireEvent, render, screen } from "@testing-library/react";

import type { CatalogSummaryDTO } from "@/modules/catalog/domain/catalog-summary";
import { CatalogNextUpIsland } from "../CatalogNextUpIsland";

const data = (attention: Partial<CatalogSummaryDTO["attention"]>): CatalogSummaryDTO => ({
  products: { total: 128, active: 118, inactive: 10, physical: 76, services: 42 },
  stock: { ok: 60, low: 3, out: 7, untracked: 6 },
  attention: { without_images: 0, out_of_stock: 0, uncategorized: 0, enrichment_failed: 0, ...attention },
});

describe("CatalogNextUpIsland (catálogo premium F2)", () => {
  it("lo que impide vender, con sus enlaces al listado filtrado", () => {
    render(
      <CatalogNextUpIsland
        summary={{ data: data({ without_images: 14, out_of_stock: 7 }), status: "ready" }}
        onRetry={jest.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "14 productos que tu agente no puede mostrar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver los 14 sin fotos" })).toHaveAttribute("href", "/catalog/products?has_images=false");
    expect(screen.getByRole("link", { name: "Ver los agotados" })).toHaveAttribute("href", "/catalog/products?stock_state=out");
    expect(screen.getByText("tu agente responde que no hay")).toBeInTheDocument();
  });

  it("sin pendientes: «Todo listo para vender», sin acciones", () => {
    render(<CatalogNextUpIsland summary={{ data: data({}), status: "ready" }} onRetry={jest.fn()} />);
    expect(screen.getByRole("heading", { name: "Todo listo para vender" })).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("si no pudo leer el resumen lo dice — jamás «Todo listo» sin haber mirado", () => {
    const onRetry = jest.fn();
    render(<CatalogNextUpIsland summary={{ data: null, status: "error" }} onRetry={onRetry} />);
    expect(screen.getByRole("heading", { name: "No pudimos revisar tu catálogo" })).toBeInTheDocument();
    expect(screen.queryByText("Todo listo para vender")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("cargando: silueta, sin titular", () => {
    render(<CatalogNextUpIsland summary={{ data: null, status: "loading" }} onRetry={jest.fn()} />);
    expect(screen.getByRole("status", { name: "Cargando lo próximo" })).toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});
