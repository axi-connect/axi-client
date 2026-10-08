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

/**
 * Plan catalog_images_gallery: el alta ya no tiene «Imagen (URL)». Las fotos
 * se eligen del dispositivo en su propio paso, la primera queda como principal
 * y «Antes de crear» lo dice.
 */
describe("ProductForm · fotos sin URL", () => {
  beforeAll(() => {
    URL.createObjectURL = jest.fn((file: Blob) => `blob:${(file as File).name}`);
    URL.revokeObjectURL = jest.fn();
  });

  it("no hay campo de URL y el paso «Fotos» invita a elegirlas", () => {
    render(<ProductForm onCreated={jest.fn()} />);
    expect(screen.queryByText(/Imagen \(URL\)/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https:\/\//)).not.toBeInTheDocument();
    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar o arrastrar/ })).toBeInTheDocument();
    expect(screen.getByText("Sin fotos tu agente no podrá mostrar este producto.")).toBeInTheDocument();
  });

  it("elegir fotos deja la primera como principal y «Antes de crear» lo cuenta", () => {
    const { container } = render(<ProductForm onCreated={jest.fn()} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    const files = [new File(["a"], "frente.jpg", { type: "image/jpeg" }), new File(["b"], "espalda.jpg", { type: "image/jpeg" })];
    fireEvent.change(input as HTMLInputElement, { target: { files } });

    expect(screen.getAllByText("Principal")).toHaveLength(1);
    expect(screen.getByText("2 fotos, con «frente.jpg» como principal")).toBeInTheDocument();
    expect(screen.getByText(/Las fotos se suben al crear/)).toBeInTheDocument();
  });
});
