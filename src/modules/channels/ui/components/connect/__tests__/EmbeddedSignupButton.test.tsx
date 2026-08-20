import { render, screen } from "@testing-library/react";

import { channelProvider } from "@/modules/channels/domain/channel-providers";
import type { EmbeddedSignupPhase } from "@/modules/channels/domain/meta-signup";
import type { UseEmbeddedSignupResult } from "@/modules/channels/infrastructure/hooks/use-embedded-signup";

/**
 * El paso 3 solo tiene una responsabilidad: pintar UNA fase a la vez, con el
 * botón en el estado correcto y las regiones vivas que anuncian la transición.
 * La lógica del flujo se prueba en el test de la máquina de estados; aquí se
 * asserta lo que un lector de pantalla y un teclado perciben.
 */
let state: UseEmbeddedSignupResult;

jest.mock("@/modules/channels/infrastructure/hooks/use-embedded-signup", () => ({
  useEmbeddedSignup: () => state,
}));

jest.mock("@/modules/channels/ui/forms/ChannelForm", () => ({
  __esModule: true,
  default: () => <form id="channels-form" />,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EmbeddedSignupButton, CancelledNotice } = require("../EmbeddedSignupButton") as typeof import("../EmbeddedSignupButton");

function phaseState(phase: EmbeddedSignupPhase, error: UseEmbeddedSignupResult["error"] = null) {
  return {
    phase,
    error,
    config: null,
    channel: null,
    onboardingStatus: null,
    start: jest.fn(),
    submitPin: jest.fn(),
    submittingPin: false,
    reset: jest.fn(),
  } satisfies UseEmbeddedSignupResult;
}

function renderPhase(phase: EmbeddedSignupPhase, error: UseEmbeddedSignupResult["error"] = null) {
  state = phaseState(phase, error);
  render(
    <EmbeddedSignupButton
      provider={channelProvider("whatsapp_cloud")}
      channelName="Ventas"
      onConnected={jest.fn()}
      onManualCreated={jest.fn()}
    />,
  );
  return state;
}

describe("EmbeddedSignupButton", () => {
  it("el botón NACE deshabilitado mientras se prepara", () => {
    renderPhase("preparing");

    // Es la consecuencia visible de D2: si nace habilitado, alguien movió la
    // carga del SDK al onClick y el navegador va a bloquear el popup
    expect(screen.getByRole("button", { name: /Preparando la conexión/i })).toBeDisabled();
  });

  it("en `ready` el botón se habilita y llama a `start`", () => {
    const current = renderPhase("ready");
    const button = screen.getByRole("button", { name: /Conectar con Meta/i });

    expect(button).toBeEnabled();
    button.click();
    expect(current.start).toHaveBeenCalledTimes(1);
  });

  it("durante el popup el botón se bloquea y se anuncian los sub-pasos", () => {
    renderPhase("popup_open");

    expect(screen.getByRole("button", { name: /Esperando a Meta/i })).toBeDisabled();
    // `polite` para lo que está en curso: no interrumpe al lector a media frase
    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    // Saber cuántos pasos faltan DENTRO del popup es lo que reduce el abandono
    expect(screen.getByText("Eliges el negocio y el número")).toBeInTheDocument();
    expect(screen.getByText("Meta verifica el número por SMS o llamada")).toBeInTheDocument();
  });

  it("`popup_blocked` explica cómo permitir la ventana, por navegador", () => {
    renderPhase("popup_blocked");

    const alert = screen.getByRole("alert");
    // `assertive`: el usuario está esperando algo que no va a pasar
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText(/Tu navegador bloqueó la ventana de Meta/i)).toBeInTheDocument();
    expect(screen.getByText(/En Chrome y Edge/i)).toBeInTheDocument();
    // La salida es reabrir el popup, nunca reintentar el mismo `code`
    expect(screen.getByRole("button", { name: /Volver a intentar/i })).toBeEnabled();
  });

  it("`cancelled` dice que no se guardó nada", () => {
    renderPhase("cancelled");

    expect(screen.getByText(/No se conectó nada y no se guardó ningún dato/i)).toBeInTheDocument();
    // WhatsApp NO especula con un fallo de Meta: su popup manda CANCEL y ERROR
    // por postMessage, así que aquí una cancelación es una cancelación
    expect(screen.queryByText(/Sorry, something went wrong/i)).not.toBeInTheDocument();
  });

  it("en Instagram y Messenger, `cancelled` no culpa al usuario", () => {
    // El popup de páginas no manda postMessage: si Meta revienta contra su
    // pantalla genérica, la heurística de los 600 ms lo llama cancelación. Decir
    // "cerraste la ventana" ante un fallo de permisos es el bucle de reintento
    // infinito que este aviso existe para cortar.
    render(<CancelledNotice mayBeMetaError />);

    expect(screen.getByText(/No recibimos la autorización de Meta/i)).toBeInTheDocument();
    expect(screen.getByText(/Sorry, something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/falta un permiso en la configuración de Meta/i)).toBeInTheDocument();
  });

  it("`error` muestra el mensaje traducido y el código como referencia", () => {
    renderPhase("error", {
      code: "channels/meta_code_expired",
      message: "La autorización caducó. Vuelve a intentarlo.",
    });

    expect(screen.getByText("La autorización caducó. Vuelve a intentarlo.")).toBeInTheDocument();
    // El código está para citarlo a soporte, no para que el usuario lo entienda
    expect(screen.getByText("channels/meta_code_expired")).toBeInTheDocument();
    // Cero jerga en la superficie: nada de identificadores de Meta
    expect(screen.queryByText(/phone_number_id|WABA|Graph API/i)).toBeNull();
  });

  it("en `unavailable` el camino manual SUBE a visible y el botón queda inerte", () => {
    renderPhase("unavailable", {
      code: "sdk/blocked",
      message: "No pudimos cargar el conector de Meta.",
    });

    expect(screen.getByRole("button", { name: /Conectar con Meta/i })).toBeDisabled();
    // Si la red corporativa bloquea el SDK, esconder el único camino que
    // funciona detrás de un acordeón deja al cliente sin salida: ahí el camino
    // manual se pinta como PANEL, no como `details` que el usuario pueda cerrar
    const heading = screen.getByRole("heading", { name: /Credenciales de Meta/i });
    expect(heading).toBeInTheDocument();
    expect(heading.closest("details")).toBeNull();
  });

  it("con el conector disponible el camino manual queda colapsado", () => {
    renderPhase("ready");

    const fallback = screen.getByText(/Ya tengo mis credenciales de Meta \(avanzado\)/i);
    expect(fallback.closest("details")).not.toHaveAttribute("open");
  });
});
