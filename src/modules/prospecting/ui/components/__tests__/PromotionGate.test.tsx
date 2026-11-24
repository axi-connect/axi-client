import { cleanup, render, screen } from "@testing-library/react";

import type { LeadDetailDTO } from "../../../domain/lead";
import { PromotionGate } from "../PromotionGate";

afterEach(cleanup);

/** El teléfono principal con el tipo que le da el servidor (`contact_points.phones[].type`). */
function phones(value: string, type: "celular" | "fijo" | "desconocido"): LeadDetailDTO["contact_points"] {
  return {
    emails: [],
    phones: [{ value, type, whatsapp: false, source: "google_places", source_url: null, primary: true }],
  };
}

/** Un negocio descubierto en un mapa (datos ficticios de «Norte Studio»). */
function lead(overrides: Partial<LeadDetailDTO> = {}): LeadDetailDTO {
  return {
    display_name: "Hotel Boutique Casa Lumbre",
    legal_name: "Inversiones Casa Lumbre S.A.S.",
    email: "info@casalumbre.example",
    phone: "+573105550142",
    legal_basis: "public_business_data",
    allowed_channels: ["email", "manual"],
    whatsapp_cold_controlled: false,
    contact_points: phones("+573105550142", "celular"),
    ...overrides,
  } as LeadDetailDTO;
}

describe("PromotionGate — el renglón de WhatsApp mira la política", () => {
  it("frío APAGADO: el texto de siempre, «WhatsApp queda bloqueado»", () => {
    render(<PromotionGate lead={lead()} busy={false} onPromote={jest.fn()} />);
    expect(screen.getByText("WhatsApp queda bloqueado")).toBeInTheDocument();
    expect(screen.getByText(/Meta suspende el número/)).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp en frío controlado")).toBeNull();
    expect(screen.getByText("Correo · Llamada o trabajo manual")).toBeInTheDocument();
  });

  it("frío ENCENDIDO: «WhatsApp en frío controlado», con sus frenos, y WhatsApp entre los canales", () => {
    render(<PromotionGate lead={lead({ whatsapp_cold_controlled: true })} busy={false} onPromote={jest.fn()} />);
    expect(screen.getByText("WhatsApp en frío controlado")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tu política lo tiene encendido: sale con plantilla aprobada, solo a celulares y dentro del tope del día.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp queda bloqueado")).toBeNull();
    expect(screen.getByText("WhatsApp · Correo · Llamada o trabajo manual")).toBeInTheDocument();
  });

  it("frío encendido pero SIN teléfono: no promete WhatsApp", () => {
    render(
      <PromotionGate
        lead={lead({ phone: null, whatsapp_cold_controlled: true, contact_points: { emails: [], phones: [] } })}
        busy={false}
        onPromote={jest.fn()}
      />,
    );
    expect(screen.queryByText("WhatsApp en frío controlado")).toBeNull();
    expect(screen.getByText("WhatsApp en frío: falta un celular")).toBeInTheDocument();
    expect(screen.getByText(/no tenemos su teléfono/)).toBeInTheDocument();
    // Y no lo cuenta entre los canales con que se le puede contactar.
    expect(screen.getByText("Correo · Llamada o trabajo manual")).toBeInTheDocument();
  });

  it("frío encendido y solo un FIJO: tampoco; en frío solo sale a celulares", () => {
    render(
      <PromotionGate
        lead={lead({
          phone: "+576015550188",
          whatsapp_cold_controlled: true,
          contact_points: phones("+576015550188", "fijo"),
        })}
        busy={false}
        onPromote={jest.fn()}
      />,
    );
    expect(screen.queryByText("WhatsApp en frío controlado")).toBeNull();
    expect(screen.getByText("WhatsApp en frío: falta un celular")).toBeInTheDocument();
    expect(screen.getByText(/solo sale a celulares/)).toBeInTheDocument();
    expect(screen.queryByText(/^WhatsApp · Correo/)).toBeNull();
  });

  /*
    D2 de la 3.ª auditoría: la puerta promete lo que el envío hará. Qué es un
    celular lo dice el tipo que manda el servidor, no la forma del número.
  */
  it("D2 caso A: «+573085550177» (rango 308, el servidor no lo tipa celular): NO promete WhatsApp en frío", () => {
    render(
      <PromotionGate
        lead={lead({
          phone: "+573085550177",
          whatsapp_cold_controlled: true,
          contact_points: phones("+573085550177", "desconocido"),
        })}
        busy={false}
        onPromote={jest.fn()}
      />,
    );
    expect(screen.queryByText("WhatsApp en frío controlado")).toBeNull();
    expect(screen.getByText("WhatsApp en frío: falta un celular")).toBeInTheDocument();
    expect(screen.getByText("Correo · Llamada o trabajo manual")).toBeInTheDocument();
  });

  it("D2 caso B: «310 555 0188» (el servidor lo tipa celular: al promover queda +57…): SÍ lo promete", () => {
    render(
      <PromotionGate
        lead={lead({
          phone: "310 555 0188",
          whatsapp_cold_controlled: true,
          contact_points: phones("310 555 0188", "celular"),
        })}
        busy={false}
        onPromote={jest.fn()}
      />,
    );
    expect(screen.getByText("WhatsApp en frío controlado")).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp en frío: falta un celular")).toBeNull();
    expect(screen.getByText("WhatsApp · Correo · Llamada o trabajo manual")).toBeInTheDocument();
  });

  it("quien dio permiso no es frío: el texto del permiso, esté la política como esté", () => {
    render(
      <PromotionGate
        lead={lead({ allowed_channels: ["whatsapp", "email", "manual"], whatsapp_cold_controlled: true })}
        busy={false}
        onPromote={jest.fn()}
      />,
    );
    expect(screen.getByText("Puedes escribirle por WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp en frío controlado")).toBeNull();
  });

  it("promover sigue disponible en los dos casos", () => {
    render(<PromotionGate lead={lead()} busy={false} onPromote={jest.fn()} />);
    expect(screen.getByRole("button", { name: "Promover al CRM" })).toBeEnabled();
  });
});
