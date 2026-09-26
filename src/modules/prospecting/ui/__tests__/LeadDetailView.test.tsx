import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { LeadDetailDTO } from "../../domain/lead";
import { LeadDetailView } from "../LeadDetailView";

/**
 * La ficha del lead tras el rediseño premium (F4b). Se fija lo que cambió de
 * comportamiento —el error se dice aquí en vez de echar a la bandeja, y
 * «Descartar» exige permiso— y lo que no puede perderse: el mapa, de dónde salió
 * cada dato y la puerta de promoción como la única isla.
 */

let mockPermissions = new Set(["leads:manage", "leads:promote"]);
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: (code: string) => mockPermissions.has(code) }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

const push = jest.fn();
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/marketing/leads/l1",
}));

jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null, connected: false }),
  useSocketEvent: () => undefined,
}));

// El mapa real pinta teselas de OSM: aquí basta con saber que se monta con su punto.
jest.mock("@/shared/components/features/location", () => ({
  MapPreview: ({ label, lat, lng }: { label: string; lat: number; lng: number }) => (
    <div data-testid="map">{`${label} · ${String(lat)},${String(lng)}`}</div>
  ),
}));

jest.mock("@/modules/crm/ui/components/BulkFollowUpButton", () => ({
  BulkFollowUpButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));

jest.mock("../../infrastructure/services/prospecting-service.adapter", () => ({
  getLead: jest.fn(),
  promoteLeads: jest.fn(),
  enrichLead: jest.fn(),
  verifyLead: jest.fn(),
  discardLead: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("../../infrastructure/services/prospecting-service.adapter") as {
  getLead: jest.Mock;
  discardLead: jest.Mock;
};

function lead(over: Partial<LeadDetailDTO> = {}): LeadDetailDTO {
  return {
    id: "l1",
    source: "google_places",
    external_id: null,
    kind: "business",
    display_name: "Spa Piel de Seda",
    legal_name: "Piel de Seda S.A.S.",
    email: "hola@pieldeseda.co",
    phone: "+57 604 555 0142",
    website: "https://pieldeseda.co",
    domain: "pieldeseda.co",
    country: "CO",
    city: "Medellín",
    address: "Cra. 37 #8A-45",
    latitude: 6.2089,
    longitude: -75.5693,
    tax_id: "901234567",
    socials: {},
    data_count: 4,
    data_present: ["phone", "email", "website", "address"],
    category: "Spa",
    quality_score: 86,
    quality_status: "verified",
    quality_signals: {},
    legal_basis: "public_business_data",
    allowed_channels: ["email", "manual"],
    status: "qualified",
    contact_id: null,
    source_ref: null,
    attributes: {
      display_name: { value: "Spa Piel de Seda", source: "google_places", fetched_at: "2026-09-24T12:00:00Z" },
    },
    last_enriched_at: null,
    promoted_at: null,
    created_at: "2026-09-24T12:00:00Z",
    last_run: null,
    events: [],
    ...over,
  } as LeadDetailDTO;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPermissions = new Set(["leads:manage", "leads:promote"]);
});
afterEach(cleanup);

describe("ficha de un lead calificado", () => {
  beforeEach(async () => {
    api.getLead.mockResolvedValue(lead());
    render(<LeadDetailView leadId="l1" />);
    await screen.findByRole("heading", { level: 1, name: "Spa Piel de Seda" });
  });

  it("monta el mapa con la dirección y el punto del lead", () => {
    expect(screen.getByTestId("map")).toHaveTextContent("Cra. 37 #8A-45 · 6.2089,-75.5693");
  });

  it("la puerta de promoción es la isla, con sus requisitos y el bloqueo de WhatsApp dicho", () => {
    const gate = within(screen.getByRole("region", { name: "Promover al CRM" }));
    expect(gate.getByText("Base legal declarada")).toBeInTheDocument();
    expect(gate.getByText("WhatsApp queda bloqueado")).toBeInTheDocument();
    expect(gate.getByRole("button", { name: "Promover al CRM" })).toBeEnabled();
  });

  it("dice de dónde salió cada dato", () => {
    const provenance = within(screen.getByText("Datos y de dónde salió cada uno").closest("section")!);
    expect(provenance.getAllByText("Spa Piel de Seda").length).toBeGreaterThan(0);
  });

  it("descartar lleva a la bandeja con su aviso", async () => {
    api.discardLead.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole("button", { name: /Descartar/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/marketing/leads"));
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Lead descartado" }));
  });
});

describe("permisos", () => {
  it("sin `leads:manage` no hay acciones de gestión — «Descartar» incluido (antes no miraba permisos)", async () => {
    mockPermissions = new Set(["leads:read"]);
    api.getLead.mockResolvedValue(lead());
    render(<LeadDetailView leadId="l1" />);
    await screen.findByRole("heading", { level: 1, name: "Spa Piel de Seda" });

    expect(screen.queryByRole("button", { name: /Descartar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Buscar datos/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Promover al CRM" })).not.toBeInTheDocument();
  });
});

describe("ya promovido", () => {
  it("la isla dice qué sigue: ver en el CRM y poner al agente a trabajar", async () => {
    api.getLead.mockResolvedValue(lead({ status: "promoted", contact_id: "c9" }));
    render(<LeadDetailView leadId="l1" />);

    const island = within(await screen.findByRole("region", { name: "Ya es un contacto de tu CRM" }));
    expect(island.getByRole("link", { name: "Ver en el CRM" })).toHaveAttribute("href", "/crm/contacts/c9");
    expect(island.getByRole("button", { name: "Poner al agente a trabajar" })).toBeInTheDocument();
  });
});

describe("cuando no se puede abrir", () => {
  it("lo dice aquí con «Reintentar» en vez de echar a la bandeja", async () => {
    api.getLead.mockRejectedValueOnce(new Error("Se cayó la conexión"));
    render(<LeadDetailView leadId="l1" />);

    expect(await screen.findByText("No pudimos abrir el lead")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();

    api.getLead.mockResolvedValue(lead());
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Spa Piel de Seda" })).toBeInTheDocument();
  });
});
