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

describe("buildCrumbs: la agenda", () => {
  it("el detalle de la cita termina en «Cita», sin «Cita › Detalle»", () => {
    // La misma forma que SCHEDULING_BREADCRUMBS (shared no importa de modules).
    const config = {
      unlinked: ["/scheduling/calendar/appointment"],
      hidden: ["/scheduling/calendar/appointment"],
      children: { "/scheduling/calendar/appointment": { "*": "Cita" } },
    };
    const labels = buildCrumbs("/scheduling/calendar/appointment/01a0dbab-fcd8-72f8-b7be-5ef9d4441e01", [
      config,
    ]).map((c) => c.label);
    expect(labels).toEqual(["Agenda", "Calendario", "Cita"]);
    // Sin la config del módulo, el intermedio sí se ve (nada se oculta por defecto).
    expect(buildCrumbs("/scheduling/calendar/appointment/01a0dbab-fcd8-72f8-b7be-5ef9d4441e01")).toHaveLength(4);
  });

  it("dice Agenda › Calendario, no scheduling › calendar", () => {
    expect(buildCrumbs("/scheduling/calendar").map((c) => c.label)).toEqual(["Agenda", "Calendario"]);
  });
});
