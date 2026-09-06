import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { IntegrationDTO } from "@/modules/integrations/domain/integration";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockStartSync = jest.fn();
const mockDisconnect = jest.fn();
const mockRotate = jest.fn();
jest.mock(
  "@/modules/integrations/infrastructure/services/integrations-service.adapter",
  () => ({
    startIntegrationSync: (...args: unknown[]) => mockStartSync(...args),
    disconnectIntegration: (...args: unknown[]) => mockDisconnect(...args),
    rotateIntegrationCredentials: (...args: unknown[]) => mockRotate(...args),
  }),
);

const mockRemoveIntegration = jest.fn();
jest.mock("@/modules/integrations/infrastructure/stores/integrations.store", () => ({
  useIntegrationsStore: (
    selector: (state: { removeIntegration: typeof mockRemoveIntegration }) => unknown,
  ) => selector({ removeIntegration: mockRemoveIntegration }),
}));

/* eslint-disable @typescript-eslint/no-require-imports -- los mocks de arriba
   exigen require() tras jest.mock (import estático se izaría antes del mock) */
const { EstadoTab } = require("../EstadoTab") as typeof import("../EstadoTab");
/* eslint-enable @typescript-eslint/no-require-imports */

const INTEGRATION = {
  id: "int-1",
  provider: "shopify",
  status: "connected",
  external_account: "tribal-store-4813.myshopify.com",
  account_label: "Savage",
  credential_mode: "client_credentials",
  token_last4: "abcd",
  api_version: "2026-07",
  granted_scopes: ["read_products"],
  capabilities: ["catalog", "inventory", "orders"],
  last_error: null,
  last_synced_at: null,
  connected_at: "2026-09-06T15:00:00.000Z",
  created_at: "2026-09-06T15:00:00.000Z",
} as unknown as IntegrationDTO;

/**
 * Las dos acciones que el dueño usa en la primera sincronización. «Sincronizar
 * ahora» avisa al detalle para saltar a Historial (antes el dueño se quedaba
 * mirando «Todavía no corre»); «Desconectar» es la única acción destructiva y
 * era la única sin manejo de error.
 */
describe("EstadoTab", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockStartSync.mockReset();
    mockDisconnect.mockReset();
    mockRemoveIntegration.mockReset();
  });

  it("«Sincronizar ahora» encola un backfill y pide saltar a Historial", async () => {
    mockStartSync.mockResolvedValue({ run_id: "run-1" });
    const onSyncStarted = jest.fn();
    render(
      <EstadoTab
        integration={INTEGRATION}
        onChanged={jest.fn()}
        onSyncStarted={onSyncStarted}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Sincronizar ahora/ }));

    await waitFor(() => expect(onSyncStarted).toHaveBeenCalledTimes(1));
    expect(mockStartSync).toHaveBeenCalledWith("int-1", "backfill");
  });

  it("si desconectar falla, el diálogo lo dice y no navega", async () => {
    mockDisconnect.mockRejectedValue(new Error("Sin permiso para desconectar"));
    render(<EstadoTab integration={INTEGRATION} onChanged={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Desconectar/ }));
    const confirm = screen.getAllByRole("button", { name: /^Desconectar$/ }).at(-1);
    if (confirm === undefined) throw new Error("sin botón de confirmación");
    fireEvent.click(confirm);

    expect(await screen.findByRole("alert")).toHaveTextContent("Sin permiso para desconectar");
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockRemoveIntegration).not.toHaveBeenCalled();
  });

  it("si desconectar funciona, saca la integración del store y vuelve a la lista", async () => {
    mockDisconnect.mockResolvedValue(undefined);
    render(<EstadoTab integration={INTEGRATION} onChanged={jest.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /Desconectar/ }));
    const confirm = screen.getAllByRole("button", { name: /^Desconectar$/ }).at(-1);
    if (confirm === undefined) throw new Error("sin botón de confirmación");
    fireEvent.click(confirm);

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/settings/integrations"));
    expect(mockRemoveIntegration).toHaveBeenCalledWith("int-1");
  });
});
