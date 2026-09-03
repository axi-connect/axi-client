import { fireEvent, render, screen } from "@testing-library/react";

import { channelProvider } from "@/modules/channels/domain/channel-providers";
import type { EmbeddedSignupPhase } from "@/modules/channels/domain/meta-signup";
import type { UsePageSignupResult } from "@/modules/channels/infrastructure/hooks/use-page-signup";

/**
 * El botón de páginas reutiliza los avisos del de WhatsApp para que el mismo
 * fallo no se explique de dos formas. Pero compartió también lo que NO era
 * común: el indicador de progreso anunciaba «Meta verifica el número por SMS o
 * llamada» en un flujo donde no hay número ni SMS. Y su «Volver a intentar»
 * solo reseteaba: hacía falta un segundo clic.
 */
let state: UsePageSignupResult;

jest.mock("@/modules/channels/infrastructure/hooks/use-page-signup", () => ({
  usePageSignup: () => state,
}));
jest.mock("../PageAssetPicker", () => ({ PageAssetPicker: () => <p>elige una página</p> }));
jest.mock("../ManualCredentialsFallback", () => ({ ManualCredentialsFallback: () => null }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PageSignupButton } = require("../PageSignupButton") as typeof import("../PageSignupButton");

function phaseState(phase: EmbeddedSignupPhase, error: UsePageSignupResult["error"] = null) {
  return {
    phase,
    error,
    channel: null,
    assets: [],
    connecting: false,
    start: jest.fn(),
    choose: jest.fn(),
    reset: jest.fn(),
    retryConfig: jest.fn(),
  } satisfies UsePageSignupResult;
}

function renderPhase(
  phase: EmbeddedSignupPhase,
  kind: "instagram_dm" | "facebook_messenger" = "instagram_dm",
  error: UsePageSignupResult["error"] = null,
) {
  state = phaseState(phase, error);
  render(
    <PageSignupButton provider={channelProvider(kind)} onConnected={jest.fn()} onManualCreated={jest.fn()} />,
  );
  return state;
}

describe("PageSignupButton", () => {
  it.each(["instagram_dm", "facebook_messenger"] as const)(
    "%s: el progreso habla de páginas, no de SMS ni de número",
    (kind) => {
      renderPhase("popup_open", kind);

      expect(screen.queryByText(/SMS/i)).toBeNull();
      expect(screen.queryByText(/el número/i)).toBeNull();
      expect(screen.getByText(/páginas de Facebook/i)).toBeInTheDocument();
    },
  );

  it("«Volver a intentar» reabre el popup en el mismo clic: reset Y start", () => {
    const state = renderPhase("cancelled");

    fireEvent.click(screen.getByRole("button", { name: /Volver a intentar/i }));

    expect(state.reset).toHaveBeenCalledTimes(1);
    expect(state.start).toHaveBeenCalledTimes(1);
  });

  it("si la configuración no se pudo leer ofrece reintentar", () => {
    const state = renderPhase("unavailable", "instagram_dm", {
      code: "channels/meta_config_unreachable",
      message: "red",
    });

    fireEvent.click(screen.getByRole("button", { name: /Reintentar la conexión/i }));
    expect(state.retryConfig).toHaveBeenCalledTimes(1);
  });

  it("con la capacidad ausente el botón queda inerte y el picker no aparece", () => {
    renderPhase("unavailable", "instagram_dm", {
      code: "channels/meta_signup_disabled",
      message: "apagado",
    });

    expect(screen.getByRole("button", { name: /Conectar Instagram/i })).toBeDisabled();
    expect(screen.queryByText(/elige una página/i)).toBeNull();
  });

  it("en `choosing_asset` pinta el selector en lugar del botón", () => {
    renderPhase("choosing_asset");

    expect(screen.getByText(/elige una página/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Conectar Instagram/i })).toBeNull();
  });
});
