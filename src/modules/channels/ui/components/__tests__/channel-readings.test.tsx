import { render, screen } from "@testing-library/react";

import type { ChannelDTO } from "@/modules/channels/domain/channel";
import { ChannelCard } from "../ChannelCard";
import { ChannelHealthCard } from "../ChannelHealthCard";

/**
 * Estas dos superficies muestran lecturas por canal, y su bug natural es el
 * mismo: ramificar por `whatsapp_cloud` frente a "todo lo demás" y acabar
 * enseñando a Instagram y Messenger un dato de WhatsApp.
 *
 * Se descubrió en producción con un canal de Messenger real anunciando
 * "Sesión — Vinculada al celular", que es un concepto exclusivo de WhatsApp Web.
 * Un canal que miente sobre cómo está conectado es peor que uno que calla.
 */
function channel(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Canal",
    kind: "facebook_messenger",
    provider_account_id: "1297887983398000",
    status: "connected",
    display_phone_number: null,
    verified_name: "Axi connect",
    waba_id: null,
    default_ai_agent_id: null,
    credentials_configured: true,
    token_last4: "aBcD",
    quality_rating: null,
    messaging_limit: null,
    last_health_check_at: null,
    token_expires_at: null,
    credentials_revoked: false,
    business_id: null,
    connection_method: "manual_token",
    onboarding: null,
    created_at: "2026-08-10T00:00:00.000Z",
    updated_at: "2026-08-10T00:00:00.000Z",
    ...overrides,
  } as ChannelDTO;
}

describe("ChannelCard — métricas por kind", () => {
  it("Messenger NO anuncia una sesión vinculada al celular", () => {
    render(<ChannelCard channel={channel({ kind: "facebook_messenger" })} />);

    expect(screen.queryByText("Sesión")).toBeNull();
    expect(screen.queryByText(/Vinculada al celular/i)).toBeNull();
  });

  it("Instagram tampoco", () => {
    render(<ChannelCard channel={channel({ kind: "instagram_dm" })} />);

    expect(screen.queryByText(/Vinculada al celular/i)).toBeNull();
  });

  it("whatsapp_cloud muestra calidad y límite, no sesión", () => {
    render(<ChannelCard channel={channel({ kind: "whatsapp_cloud", quality_rating: "GREEN" })} />);

    expect(screen.getByText("Calidad del número")).toBeInTheDocument();
    expect(screen.getByText("Puedes iniciar")).toBeInTheDocument();
    expect(screen.queryByText("Sesión")).toBeNull();
  });
});

describe("ChannelHealthCard — la etiqueta de la cuenta depende del kind", () => {
  it("para Messenger la etiqueta es «Cuenta», no «Teléfono»", () => {
    render(<ChannelHealthCard channel={channel({ kind: "facebook_messenger" })} />);

    expect(screen.getByText("Cuenta")).toBeInTheDocument();
    expect(screen.queryByText("Teléfono")).toBeNull();
  });

  it("para Instagram muestra el usuario público en ese campo", () => {
    // El adaptador de IG/Messenger reutiliza `display_phone_number` para el
    // handle: no es un teléfono ausente, es otro dato mal etiquetado
    render(
      <ChannelHealthCard
        channel={channel({ kind: "instagram_dm", display_phone_number: "@axiconnect" })}
      />,
    );

    expect(screen.getByText("Cuenta")).toBeInTheDocument();
    expect(screen.getByText("@axiconnect")).toBeInTheDocument();
  });

  it("para WhatsApp Cloud sigue siendo «Teléfono»", () => {
    render(
      <ChannelHealthCard
        channel={channel({ kind: "whatsapp_cloud", display_phone_number: "+57 318 0139091" })}
      />,
    );

    expect(screen.getByText("Teléfono")).toBeInTheDocument();
    expect(screen.getByText("+57 318 0139091")).toBeInTheDocument();
  });

  it("una cadena vacía se lee «Sin datos», no como un hueco", () => {
    // Una página de Facebook sin usuario configurado devuelve '' en
    // validateCredentials, y '' pintaba una celda vacía sin explicación
    // `last_health_check_at` con fecha para que el único «Sin datos» de la
    // tarjeta sea el del campo que se está probando
    render(
      <ChannelHealthCard
        channel={channel({
          kind: "facebook_messenger",
          display_phone_number: "",
          last_health_check_at: "2026-08-10T12:00:00.000Z",
        })}
      />,
    );

    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });
});
