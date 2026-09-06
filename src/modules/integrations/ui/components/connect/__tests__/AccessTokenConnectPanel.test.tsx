import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { IntegrationDTO } from "@/modules/integrations/domain/integration";
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderDescriptor,
} from "@/modules/integrations/domain/integration-providers";

const mockConnectIntegration = jest.fn();
jest.mock(
  "@/modules/integrations/infrastructure/services/integrations-service.adapter",
  () => ({
    connectIntegration: (...args: unknown[]) => mockConnectIntegration(...args),
  }),
);

const mockUpsertIntegration = jest.fn();
jest.mock(
  "@/modules/integrations/infrastructure/stores/integrations.store",
  () => ({
    useIntegrationsStore: (
      selector: (state: {
        upsertIntegration: typeof mockUpsertIntegration;
      }) => unknown,
    ) => selector({ upsertIntegration: mockUpsertIntegration }),
  }),
);

/* eslint-disable @typescript-eslint/no-require-imports -- el mock de arriba
   exige require() tras jest.mock (import estático se izaría antes del mock) */
const { AccessTokenConnectPanel } =
  require("../AccessTokenConnectPanel") as typeof import("../AccessTokenConnectPanel");
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * F8: el formulario del paso «Conexión» se GENERA desde el descriptor, y el
 * payload que arma es el del contrato. Para Shopify es la variante
 * `client_credentials` (app del Dev Dashboard): id + secreto de cliente.
 */
describe("AccessTokenConnectPanel", () => {
  const shopify = INTEGRATION_PROVIDERS.shopify;

  beforeEach(() => {
    mockConnectIntegration.mockReset();
    mockUpsertIntegration.mockReset();
  });

  function renderShopify(onConnected = jest.fn()) {
    render(
      <AccessTokenConnectPanel
        provider={shopify}
        config={shopify.connect}
        onConnected={onConnected}
      />,
    );
    return onConnected;
  }

  it("genera los campos de Shopify desde el descriptor, con los secretos como password", () => {
    renderShopify();

    const domain = screen.getByLabelText("Dominio de tu tienda");
    const token = screen.getByLabelText("ID de cliente");
    const secret = screen.getByLabelText("Secreto de cliente");

    expect(domain).toHaveAttribute("placeholder", "mi-tienda.myshopify.com");
    // El id de cliente NO es secreto (identifica la app); el secreto sí.
    expect(token).toHaveAttribute("type", "text");
    expect(secret).toHaveAttribute("type", "password");
    expect(
      screen.getByText(/Dev Dashboard de Shopify → tu app → Credenciales/),
    ).toBeInTheDocument();
  });

  it("el botón nace deshabilitado y arma el payload EXACTO del contrato al enviar", async () => {
    const integration = { id: "int-1" } as IntegrationDTO;
    mockConnectIntegration.mockResolvedValue(integration);
    const onConnected = renderShopify();

    const submit = screen.getByRole("button", { name: "Conectar tienda" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Dominio de tu tienda"), {
      target: { value: " mi-tienda.myshopify.com " },
    });
    fireEvent.change(screen.getByLabelText("ID de cliente"), {
      target: { value: "abc123def456" },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Secreto de cliente"), {
      target: { value: "shpss_xyz0123456789" },
    });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(integration));
    expect(mockConnectIntegration).toHaveBeenCalledWith({
      provider: "shopify",
      external_account: "mi-tienda.myshopify.com",
      credentials: {
        mode: "client_credentials",
        client_id: "abc123def456",
        client_secret: "shpss_xyz0123456789",
      },
    });
    expect(mockUpsertIntegration).toHaveBeenCalledWith(integration);
  });

  it("muestra el motivo del backend tal cual cuando el alta falla", async () => {
    mockConnectIntegration.mockRejectedValue(
      new Error("La moneda de la tienda no coincide"),
    );
    renderShopify();

    fireEvent.change(screen.getByLabelText("Dominio de tu tienda"), {
      target: { value: "mi-tienda.myshopify.com" },
    });
    fireEvent.change(screen.getByLabelText("ID de cliente"), {
      target: { value: "abc123def456" },
    });
    fireEvent.change(screen.getByLabelText("Secreto de cliente"), {
      target: { value: "shpss_xyz0123456789" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Conectar tienda" }));

    expect(
      await screen.findByText("La moneda de la tienda no coincide"),
    ).toBeInTheDocument();
  });

  it("una regla validate del descriptor corta ANTES de tocar la red", async () => {
    const provider: IntegrationProviderDescriptor = {
      ...shopify,
      connect: {
        ...shopify.connect,
        external_account_field: {
          ...shopify.connect.external_account_field,
          validate: (value) =>
            value.endsWith(".myshopify.com")
              ? null
              : "Debe terminar en .myshopify.com",
        },
      },
    };
    if (provider.connect.strategy !== "access_token")
      throw new Error("config inesperada");

    render(
      <AccessTokenConnectPanel
        provider={provider}
        config={provider.connect}
        onConnected={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Dominio de tu tienda"), {
      target: { value: "mi-tienda.com" },
    });
    fireEvent.change(screen.getByLabelText("ID de cliente"), {
      target: { value: "abc123def456" },
    });
    fireEvent.change(screen.getByLabelText("Secreto de cliente"), {
      target: { value: "shpss_xyz0123456789" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Conectar tienda" }));

    expect(
      await screen.findByText("Debe terminar en .myshopify.com"),
    ).toBeInTheDocument();
    expect(mockConnectIntegration).not.toHaveBeenCalled();
  });
});
