import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";

const mockList = jest.fn();
const mockUpdate = jest.fn();
jest.mock(
  "@/modules/integrations/infrastructure/services/integrations-service.adapter",
  () => ({
    listIntegrationLocations: (...args: unknown[]) => mockList(...args),
    updateIntegrationLocations: (...args: unknown[]) => mockUpdate(...args),
  }),
);

/* eslint-disable @typescript-eslint/no-require-imports -- los mocks de arriba
   exigen require() tras jest.mock (import estático se izaría antes del mock) */
const { LocationsTab } = require("../LocationsTab") as typeof import("../LocationsTab");
/* eslint-enable @typescript-eslint/no-require-imports */

const SUCURSAL = {
  external_location_id: "79038284093",
  name: "Sucursal de la tienda",
  is_active: true,
  counts_stock: false,
};
const USA = {
  external_location_id: "106097410365",
  name: "USA",
  is_active: false,
  counts_stock: false,
};

/**
 * Esta pestaña decide si el agente vende contra stock real. Con CERO ubicaciones
 * marcadas no hay «stock cero»: no se escribe una sola fila de inventario y una
 * variante sin fila se ofrece siempre disponible — el estado en que quedó un
 * cliente real el 2026-09-07. Y cuando el PUT falla, dejar las casillas como
 * estaban le dice al tenant que no guardó justo cuando sí pudo haber guardado.
 */
function renderTab() {
  return render(<LocationsTab integrationId="int-1" onChanged={() => Promise.resolve()} />);
}

describe("LocationsTab", () => {
  beforeEach(() => {
    mockList.mockReset();
    mockUpdate.mockReset();
    mockList.mockResolvedValue({ items: [SUCURSAL, USA] });
  });

  it("avisa de la consecuencia mientras no haya ninguna ubicación marcada", async () => {
    renderTab();
    expect(
      await screen.findByText(/ofrece TODOS los productos como disponibles/i),
    ).toBeInTheDocument();
  });

  it("guardar sin ninguna marcada pide confirmación antes de mandar nada", async () => {
    renderTab();
    fireEvent.click(await screen.findByRole("button", { name: /guardar ubicaciones/i }));

    expect(await screen.findByText(/¿Guardar sin control de stock\?/i)).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /sí, guardar así/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith("int-1", []));
  });

  it("con una ubicación marcada guarda directo, sin diálogo", async () => {
    mockUpdate.mockResolvedValue({ items: [{ ...SUCURSAL, counts_stock: true }, USA] });
    renderTab();
    fireEvent.click(await screen.findByLabelText("Sucursal de la tienda"));
    fireEvent.click(screen.getByRole("button", { name: /guardar ubicaciones/i }));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith("int-1", ["79038284093"]),
    );
    expect(screen.queryByText(/¿Guardar sin control de stock\?/i)).not.toBeInTheDocument();
  });

  it("si el guardado falla, lo dice como error y relee el estado real del servidor", async () => {
    // El 500 real de producción: sin `code` conocido y sin `detail`, así que
    // lo que ve el tenant es la copia de respaldo de esta pantalla.
    mockUpdate.mockRejectedValue(
      new HttpError({ status: 500, code: "http/500", message: "http/500", problem: null }),
    );
    renderTab();
    fireEvent.click(await screen.findByLabelText("Sucursal de la tienda"));
    fireEvent.click(screen.getByRole("button", { name: /guardar ubicaciones/i }));

    const alert = await screen.findByText(/No se pudo guardar la selección/i);
    expect(alert).toBeInTheDocument();
    // Dos llamadas: la carga inicial y la relectura tras el fallo.
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });
});
