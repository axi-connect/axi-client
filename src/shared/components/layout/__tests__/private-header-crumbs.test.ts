import { buildCrumbs } from "@/shared/components/layout/private-header";

/** QA real F1–F4: la miga enseñaba slugs crudos y el UUID del pedido. */
describe("buildCrumbs: nombres, nunca slugs ni identificadores", () => {
  it("los segmentos de Mi empresa y Pagos tienen su nombre", () => {
    expect(
      buildCrumbs("/settings/company/funciones").map((c) => c.label),
    ).toEqual(["Configuración", "Mi empresa", "Funciones"]);
    expect(
      buildCrumbs("/settings/payments/moneda").map((c) => c.label),
    ).toEqual(["Configuración", "Pagos", "Moneda y TRM"]);
  });

  it("un UUID se nombra por su ruta padre; uno desconocido es «Detalle»; un slug normal no se toca", () => {
    const id = "0199a3f2-7c1b-7e10-9a3d-5b2c1d0e9f11";
    expect(buildCrumbs(`/orders/${id}`).map((c) => c.label)).toEqual([
      "Pedidos",
      "Pedido",
    ]);
    expect(buildCrumbs(`/catalog/products/${id}`).map((c) => c.label)).toEqual([
      "Catálogo",
      "Productos",
      "Producto",
    ]);
    expect(buildCrumbs(`/cualquier/${id}`).map((c) => c.label)).toEqual([
      "cualquier",
      "Detalle",
    ]);
    // La config de un módulo sigue mandando sobre la regla genérica
    expect(
      buildCrumbs(`/orders/${id}`, [
        { children: { "/orders": { "*": "Reserva" } } },
      ]).map((c) => c.label),
    ).toEqual(["Pedidos", "Reserva"]);
  });
});
