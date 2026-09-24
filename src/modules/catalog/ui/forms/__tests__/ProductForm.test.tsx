import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("@/modules/catalog/infrastructure/stores/catalog.context", () => ({
  useCatalog: () => ({ catalogs: [], categoryTree: [], productTypes: [] }),
}));
jest.mock("@/modules/catalog/infrastructure/services/product-service.adapter", () => ({
  createProduct: jest.fn(),
}));

import { ProductForm } from "@/modules/catalog/ui/forms/ProductForm";

/**
 * QA real (2026-09-24), en producción: pulsar «Con variantes» tumbaba la app
 * entera con `TypeError: value.map is not a function` y se perdía lo escrito.
 * `default_sku` y `variants` son las dos ramas de un ternario en la misma
 * posición: sin `key`, React reutiliza el Controller y el editor de variantes
 * recibe el "" del SKU. Sin las `key`, este test cae con ese mismo TypeError.
 */
describe("ProductForm · modo de variantes", () => {
  it("«Con variantes» muestra el editor vacío en vez de tumbar la app; volver a simple devuelve el SKU", () => {
    const errors = jest.spyOn(console, "error").mockImplementation(() => undefined);
    render(<ProductForm onCreated={jest.fn()} />);
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Con variantes" }));
    expect(
      screen.getByText(/Añade la primera variante/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Producto simple" }));
    expect(screen.getByLabelText("SKU")).toBeInTheDocument();
    // Ni un error de React en el camino (el TypeError original llegaba por aquí)
    expect(errors.mock.calls.map((call) => String(call[0]))).toEqual([]);
    errors.mockRestore();
  });
});
