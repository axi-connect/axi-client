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
 * payload que arma es el del contrato. Para Shopify, los campos son EXACTOS a
 * los que estaban hardcodeados antes — esa es la garantía de no-regresión.
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
    const token = screen.getByLabelText("Token de acceso de Admin API");
    const secret = screen.getByLabelText("Clave secreta de API");

    expect(domain).toHaveAttribute("placeholder", "mi-tienda.myshopify.com");
    expect(token).toHaveAttribute("type", "password");
    expect(secret).toHaveAttribute("type", "password");
    expect(
      screen.getByText(
        "Empieza por shpat_. Shopify lo muestra UNA sola vez al instalar la app.",
      ),
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
    fireEvent.change(screen.getByLabelText("Token de acceso de Admin API"), {
      target: { value: "shpat_abc" },
    });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Clave secreta de API"), {
      target: { value: "shpss_xyz" },
    });
    expect(submit).toBeEnabled();

    fireEvent.click(submit);

    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(integration));
    expect(mockConnectIntegration).toHaveBeenCalledWith({
      provider: "shopify",
      external_account: "mi-tienda.myshopify.com",
      credentials: {
        mode: "access_token",
        access_token: "shpat_abc",
        api_secret: "shpss_xyz",
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
    fireEvent.change(screen.getByLabelText("Token de acceso de Admin API"), {
      target: { value: "shpat_abc" },
    });
    fireEvent.change(screen.getByLabelText("Clave secreta de API"), {
      target: { value: "shpss_xyz" },
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
    fireEvent.change(screen.getByLabelText("Token de acceso de Admin API"), {
      target: { value: "shpat_abc" },
    });
    fireEvent.change(screen.getByLabelText("Clave secreta de API"), {
      target: { value: "shpss_xyz" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Conectar tienda" }));

    expect(
      await screen.findByText("Debe terminar en .myshopify.com"),
    ).toBeInTheDocument();
    expect(mockConnectIntegration).not.toHaveBeenCalled();
  });
});
