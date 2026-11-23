import { cleanup, render, screen } from "@testing-library/react";

import type { LeadDetailDTO } from "../../../domain/lead";
import { PromotionGate } from "../PromotionGate";

afterEach(cleanup);

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
