import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ContactDataDTO, ContactDataField } from "@/modules/crm/domain/contact-data";
import { ContactBusinessCard, ContactBusinessLinks } from "../ContactBusinessCard";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
const permissions = { manage: true, leads: true };
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({
    hasPermission: (code: string) =>
      code === "contacts:manage" ? permissions.manage : code === "leads:read" ? permissions.leads : true,
    status: "authenticated",
  }),
}));
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: jest.fn(),
}));
jest.mock("@/modules/crm/infrastructure/services/contacts-service.adapter", () => ({
  getContactData: jest.fn(),
  reviewContactField: jest.fn(),
}));
jest.mock("@/modules/crm/infrastructure/services/tenant-users.cache", () => ({
  getTenantUserNames: jest.fn().mockResolvedValue(new Map()),
}));

// «Cómo llegarle» pide a captación los correos y teléfonos del negocio. Las
// filas son las reales (las mismas de la ficha del lead); solo se dobla la red.
jest.mock("@/modules/prospecting/infrastructure/services/prospecting-service.adapter", () => ({
  getContactBusiness: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/crm/infrastructure/services/contacts-service.adapter") as {
  getContactData: jest.Mock;
  reviewContactField: jest.Mock;
};
const prospecting = require("@/modules/prospecting/infrastructure/services/prospecting-service.adapter") as {
  getContactBusiness: jest.Mock;
};
/* eslint-enable @typescript-eslint/no-require-imports */

function field(code: string, value: string, overrides: Partial<ContactDataField> = {}): ContactDataField {
  return {
    code,
    label: "",
    defined: false,
    storage: "custom",
    type: null,
    options: null,
    required: false,
    flow: null,
    value,
    state: "captured",
    protected: false,
    source: "system",
    captured_at: "2026-11-22T13:00:00.000Z",
    conversation_id: null,
    actor_user_id: null,
    canonical_from: null,
    from_web: false,
    raw_value: null,
    invalid_reason: null,
    attempts: 0,
    proposal: null,
    ...overrides,
  };
}

function dto(fields: ContactDataField[]): ContactDataDTO {
  return { contact_id: "c1", protected_fields: [], conversation: null, fields, system: [], session: {} };
}

const BUSINESS = [
  field("website", "https://www.agencia-de-viajes-almejatours-colombia.com.co/"),
  field("instagram", "https://instagram.com/almejatours"),
  field("category", "Agencia de viajes"),
  field("google_maps_url", "https://www.google.com/maps/place/?q=place_id:ChIJ123"),
  field("original_name", "Agencia de viajes en Bogotá Almejatours | Vuelos"),
];

const NO_WAYS = { lead_id: null, contact_points: { emails: [], phones: [] } };

beforeEach(() => {
  permissions.manage = true;
  permissions.leads = true;
  api.getContactData.mockReset();
  api.reviewContactField.mockReset();
  api.getContactData.mockResolvedValue(dto(BUSINESS));
  prospecting.getContactBusiness.mockReset();
  prospecting.getContactBusiness.mockResolvedValue(NO_WAYS);
});

/** Datos ficticios del tenant de pruebas «Norte Studio». */
const email = (value: string, type: string, primary = false, source: string | null = "site_extractor") => ({
  value,
  type,
  source,
  source_url: null,
  primary,
});
const phone = (value: string, type: string, whatsapp = false, primary = false) => ({
  value,
  type,
  whatsapp,
  source: "google_places",
  source_url: null,
  primary,
});
const DECIDER = [
  field("quien_decide", "Mariana Restrepo Gil"),
  field("quien_decide_cargo", "Representante legal y gerente"),
  field("quien_decide_fuente", "Registro mercantil (RUES)"),
];

describe("ContactBusinessCard — «Quién decide» y «Cómo llegarle»", () => {
  it("nombra a quien decide con su cargo y de dónde se sabe, y enlaza a su ficha en Captación", async () => {
    api.getContactData.mockResolvedValue(dto([...BUSINESS, ...DECIDER]));
    prospecting.getContactBusiness.mockResolvedValue({ ...NO_WAYS, lead_id: "lead-9" });
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    expect(await screen.findByRole("heading", { name: "Quién decide" })).toBeInTheDocument();
    expect(screen.getByText("Mariana Restrepo Gil")).toBeInTheDocument();
    expect(screen.getByText("Representante legal y gerente · según el registro mercantil")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Abrir su ficha en Captación" })).toHaveAttribute(
      "href",
      "/marketing/leads/lead-9",
    );
    // Las claves no se repiten como texto técnico en ninguna parte de la tarjeta.
    expect(screen.queryByText(/quien_decide/)).toBeNull();
  });

  it("el pie cuenta el registro mercantil entre las fuentes cuando de ahí sale quien decide", async () => {
    api.getContactData.mockResolvedValue(
      dto([...BUSINESS, ...DECIDER.slice(0, 2), field("quien_decide_fuente", "Registro mercantil")]),
    );
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    expect(await screen.findByText(/Según Google Maps, el registro mercantil y su web/)).toBeInTheDocument();
  });

  it("UNA PISTA NO SE NOMBRA: una fuente «(sin confirmar)» no pinta «Quién decide»", async () => {
    api.getContactData.mockResolvedValue(
      dto([
        ...BUSINESS,
        field("quien_decide", "Julián Cárdenas Mora"),
        field("quien_decide_fuente", "Sitio web del negocio (sin confirmar)"),
      ]),
    );
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    await screen.findByRole("heading", { name: "El negocio" });
    expect(screen.queryByRole("heading", { name: "Quién decide" })).toBeNull();
    expect(screen.queryByText("Julián Cárdenas Mora")).toBeNull();
  });

  it("confirmada por el equipo, sí se nombra y dice que la confirmó tu equipo", async () => {
    api.getContactData.mockResolvedValue(
      dto([
        ...BUSINESS,
        field("quien_decide", "Julián Cárdenas Mora"),
        field("quien_decide_fuente", "Sitio web del negocio, confirmado por tu equipo"),
      ]),
    );
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    expect(await screen.findByText("Julián Cárdenas Mora")).toBeInTheDocument();
    expect(screen.getByText("de su sitio web, confirmado por tu equipo")).toBeInTheDocument();
  });

  it("sin quien decide ni datos de captación, la tarjeta queda como antes (0 datos)", async () => {
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    await screen.findByRole("heading", { name: "El negocio" });
    await waitFor(() => expect(prospecting.getContactBusiness).toHaveBeenCalledWith("c1"));
    expect(screen.queryByRole("heading", { name: "Quién decide" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Cómo llegarle" })).toBeNull();
  });

  it("con UN dato lo enseña sin plegable", async () => {
    prospecting.getContactBusiness.mockResolvedValue({
      lead_id: "lead-9",
      contact_points: { emails: [], phones: [phone("+573105550142", "celular", true, true)] },
    });
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    expect(await screen.findByRole("heading", { name: "Cómo llegarle" })).toBeInTheDocument();
    expect(screen.getByText("+57 310 555 0142")).toBeInTheDocument();
    expect(screen.getByText("Tiene WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText(/Ver los otros|Ver el otro/)).toBeNull();
  });

  it("con N datos: los dos principales a la vista y «Ver los otros 3» plegado", async () => {
    prospecting.getContactBusiness.mockResolvedValue({
      lead_id: "lead-9",
      contact_points: {
        emails: [
          email("mariana.restrepo@casalumbre.example", "con_nombre", true),
          email("gerencia@casalumbre.example", "de_cargo"),
          email("info@casalumbre.example", "generico", false, "google_places"),
        ],
        phones: [phone("+573105550142", "celular", true, true), phone("+576015550188", "fijo")],
      },
    });
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    const summary = await screen.findByText("Ver los otros 3");
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    // Los principales están FUERA del plegable; los demás, dentro.
    expect(details).not.toContainElement(screen.getByText("mariana.restrepo@casalumbre.example"));
    expect(details).not.toContainElement(screen.getByText("+57 310 555 0142"));
    expect(details).toContainElement(screen.getByText("gerencia@casalumbre.example"));
    expect(details).toContainElement(screen.getByText("info@casalumbre.example"));
    expect(details).toContainElement(screen.getByText("+57 601 555 0188"));
    expect(screen.getByText("Con nombre")).toBeInTheDocument();
    expect(screen.getByText("De cargo")).toBeInTheDocument();
  });

  it("solo con datos de captación (sin web ni redes) la tarjeta también se pinta", async () => {
    api.getContactData.mockResolvedValue(dto([]));
    prospecting.getContactBusiness.mockResolvedValue({
      lead_id: "lead-9",
      contact_points: { emails: [email("info@aldeaverde.example", "generico", true, null)], phones: [] },
    });
    render(<ContactBusinessCard contactId="c1" fromProspecting />);

    expect(await screen.findByRole("heading", { name: "Cómo llegarle" })).toBeInTheDocument();
    expect(screen.getByText("info@aldeaverde.example")).toBeInTheDocument();
  });

  it("sin permiso de leer captación no se pide ni se pinta «Cómo llegarle»", async () => {
    permissions.leads = false;
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    await screen.findByRole("heading", { name: "El negocio" });
    expect(prospecting.getContactBusiness).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Cómo llegarle" })).toBeNull();
  });

  it("si captación falla, lo demás de la tarjeta sigue ahí", async () => {
    prospecting.getContactBusiness.mockRejectedValue(new Error("caído"));
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    expect(await screen.findByRole("link", { name: "@almejatours" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Cómo llegarle" })).toBeNull();
  });
});

describe("ContactBusinessCard", () => {
  it("pinta «En internet» y «Ficha» con enlaces que abren aparte, y la procedencia con el nombre original", async () => {
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    expect(await screen.findByRole("heading", { name: "El negocio" })).toBeInTheDocument();
    const site = screen.getByRole("link", { name: "agencia-de-viajes-almejatours-colombia.com.co" });
    expect(site).toHaveAttribute("href", "https://www.agencia-de-viajes-almejatours-colombia.com.co/");
    expect(site).toHaveAttribute("target", "_blank");
    expect(site).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "@almejatours" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir su ficha en Maps" })).toBeInTheDocument();
    expect(screen.getByText("Agencia de viajes")).toBeInTheDocument();
    expect(screen.getByText(/Según Google Maps y su web · Captación/)).toBeInTheDocument();
    expect(screen.getByText("Agencia de viajes en Bogotá Almejatours | Vuelos")).toBeInTheDocument();
  });

  it("no se pinta si el contacto no vino de Captación (un «instagram» suelto es del cliente)", async () => {
    const { container } = render(<ContactBusinessCard contactId="c1" fromProspecting={false} />);
    await waitFor(() => expect(api.getContactData).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("no se pinta sin ningún dato del negocio", async () => {
    api.getContactData.mockResolvedValue(dto([field("company", "Kodecol", { defined: true })]));
    const { container } = render(<ContactBusinessCard contactId="c1" fromProspecting />);
    await waitFor(() => expect(api.getContactData).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("corregir guarda por la revisión del contacto (queda protegido)", async () => {
    api.reviewContactField.mockResolvedValue(
      dto([field("instagram", "@almeja_oficial", { state: "corrected", source: "user" })]),
    );
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    fireEvent.click(await screen.findByRole("button", { name: "Corregir instagram" }));
    const input = screen.getByRole("textbox", { name: "Instagram" });
    fireEvent.change(input, { target: { value: "@almeja_oficial" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(api.reviewContactField).toHaveBeenCalledWith("c1", "instagram", { value: "@almeja_oficial" }),
    );
    expect(await screen.findByText("corregido")).toBeInTheDocument();
  });

  it("sin permiso de gestionar contactos no hay «Corregir»", async () => {
    permissions.manage = false;
    render(<ContactBusinessCard contactId="c1" fromProspecting />);
    await screen.findByRole("heading", { name: "El negocio" });
    expect(screen.queryByRole("button", { name: /Corregir/ })).toBeNull();
  });
});

describe("ContactBusinessLinks", () => {
  it("una fila de accesos a la web, las redes y Maps", async () => {
    render(<ContactBusinessLinks contactId="c1" fromProspecting />);
    const nav = await screen.findByRole("navigation", { name: "El negocio en internet" });
    expect(nav.querySelectorAll("a")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Maps" })).toBeInTheDocument();
  });
});
