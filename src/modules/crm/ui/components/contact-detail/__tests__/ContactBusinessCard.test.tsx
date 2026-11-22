import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ContactDataDTO, ContactDataField } from "@/modules/crm/domain/contact-data";
import { ContactBusinessCard, ContactBusinessLinks } from "../ContactBusinessCard";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
const permissions = { manage: true };
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({
    hasPermission: (code: string) => (code === "contacts:manage" ? permissions.manage : true),
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

/* eslint-disable @typescript-eslint/no-require-imports */
const api = require("@/modules/crm/infrastructure/services/contacts-service.adapter") as {
  getContactData: jest.Mock;
  reviewContactField: jest.Mock;
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

beforeEach(() => {
  permissions.manage = true;
  api.getContactData.mockReset();
  api.reviewContactField.mockReset();
  api.getContactData.mockResolvedValue(dto(BUSINESS));
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
