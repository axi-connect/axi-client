import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { LeadDTO } from "../../domain/lead";
import { useCaptureStats } from "../../infrastructure/stores/capture-stats.store";
import { LeadsInboxView } from "../LeadsInboxView";

/**
 * La bandeja tras el rediseño premium (F4a): el contador de la pestaña y el
 * embudo leen las mismas cifras, y la selección vive en la barra de tinta con
 * los tres botones diciendo cada uno SU número.
 */

/** Sin usuario, como hasta ahora: la bandeja no guarda filtros. CAP-21 lo pone por prueba. */
let mockAuthUser: { id: string; company_id: string } | undefined;
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true, user: mockAuthUser, status: mockAuthUser ? "authenticated" : undefined }),
}));

const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn(), showModal, closeModal: jest.fn() }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/marketing/leads",
}));

jest.mock("../../infrastructure/services/prospecting-service.adapter", () => ({
  listLeads: jest.fn(),
  countLeads: jest.fn(),
  deleteLeads: jest.fn(),
  enrichLeads: jest.fn(),
  getProspectingStats: jest.fn(),
  listLeadIds: jest.fn(),
  promoteLeads: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("../../infrastructure/services/prospecting-service.adapter") as { listLeads: jest.Mock };

function lead(over: Partial<LeadDTO> = {}): LeadDTO {
  return {
    id: "l1",
    source: "google_places",
    display_name: "Spa Piel de Seda",
    legal_name: null,
    email: "hola@pieldeseda.co",
    phone: "+57 604 555 0142",
    city: "Medellín",
    quality_score: 86,
    quality_status: "verified",
    quality_signals: {},
    legal_basis: "public_business_data",
    allowed_channels: ["email", "manual"],
    data_present: ["phone", "email"],
    data_count: 2,
    status: "qualified",
    last_enriched_at: null,
    created_at: "2026-09-24T12:00:00Z",
    ...over,
  } as LeadDTO;
}

const STATS = { discovered: 1284, quarantined: 876, qualified: 312, promoted: 96, suppressed: 21 };

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthUser = undefined;
  window.localStorage.clear();
  useCaptureStats.setState({ stats: STATS });
  api.listLeads.mockResolvedValue({
    data: [lead(), lead({ id: "l2", display_name: "Centro Láser Laureles", status: "promoted" })],
    meta: { total: 2, page: 1, page_size: 25 },
  });
});
afterEach(cleanup);

it("el contador de la bandeja y el embudo leen las mismas cifras", async () => {
  render(<LeadsInboxView />);
  await screen.findByText("Spa Piel de Seda");

  expect(screen.getByRole("link", { name: /Bandeja/ })).toHaveTextContent("876");
  const funnel = within(screen.getByRole("region", { name: "El camino del lead" }));
  expect(funnel.getByText("1.284")).toBeInTheDocument();
  expect(funnel.getByText("Promovidos al CRM")).toBeInTheDocument();
  expect(funnel.getByText(/ninguna campaña puede escribirles/)).toBeInTheDocument();
});

it("la selección vive en la barra de tinta y cada botón dice su número", async () => {
  render(<LeadsInboxView />);
  await screen.findByText("Spa Piel de Seda");

  fireEvent.click(screen.getByRole("checkbox", { name: /Spa Piel de Seda/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Centro Láser Laureles/ }));

  const dock = within(screen.getByRole("region", { name: "Acciones sobre la selección" }));
  // Un promovido no se vuelve a promover ni se le buscan datos: 2 marcados, 1 elegible.
  expect(dock.getByRole("button", { name: "Promover 1 al CRM" })).toBeInTheDocument();
  expect(dock.getByRole("button", { name: /Buscar datos de 1/ })).toBeInTheDocument();
  expect(dock.getByText(/no gasta unidades de tu plan/)).toBeInTheDocument();

  fireEvent.click(dock.getByRole("button", { name: /Eliminar/ }));
  expect(showModal).toHaveBeenCalledWith(expect.objectContaining({ description: "No se puede deshacer." }));
});

it("«Nueva búsqueda» lleva a Búsquedas con la hoja abierta", async () => {
  render(<LeadsInboxView />);
  await screen.findByText("Spa Piel de Seda");
  expect(screen.getByRole("link", { name: /Nueva búsqueda/ })).toHaveAttribute("href", "/marketing/leads/searches?new=1");
});

/*
  CAP-18 · «los promovidos salen de captación». La bandeja ya no trae a los que
  son contactos del CRM, así que puede quedar vacía con el embudo lleno: decir
  «todavía no ha entrado ningún lead» con 96 promovidos arriba sería mentira.
*/
it("vacía y con promovidos en el embudo: dice que ya están en el CRM, no que no ha entrado nadie", async () => {
  api.listLeads.mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } });
  render(<LeadsInboxView />);

  expect(await screen.findByText("No queda ningún lead por revisar")).toBeInTheDocument();
  expect(screen.getByText("Los que ya están en tu CRM los ves en Filtros › Estado › En el CRM.")).toBeInTheDocument();
  expect(screen.queryByText("Todavía no ha entrado ningún lead")).not.toBeInTheDocument();
});

it("vacía y sin filtros, «Filtros» sigue a la vista: es por donde se llega a «En el CRM», sin botón suelto", async () => {
  api.listLeads.mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } });
  render(<LeadsInboxView />);
  await screen.findByText("No queda ningún lead por revisar");

  // La barra vivía solo dentro de la tabla, y sin filas no hay tabla.
  expect(screen.getByRole("button", { name: /Filtros/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Ver los que están en el CRM" })).not.toBeInTheDocument();
});

it("vacía y sin ningún promovido: sigue diciendo que todavía no ha entrado ninguno", async () => {
  useCaptureStats.setState({ stats: { ...STATS, promoted: 0 } });
  api.listLeads.mockResolvedValue({ data: [], meta: { total: 0, page: 1, page_size: 25 } });
  render(<LeadsInboxView />);

  expect(await screen.findByText("Todavía no ha entrado ningún lead")).toBeInTheDocument();
  expect(screen.queryByText("No queda ningún lead por revisar")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Filtros/ })).toBeInTheDocument();
});

/*
  CAP-21 · los filtros se quedan puestos al cambiar de página, al irse a otra
  parte y al recargar. Se guardan en el navegador por empresa y por usuario.
*/
describe("filtros guardados (CAP-21)", () => {
  const KEY = "axi:captacion:filtros:v1:company-a:user-1";
  const SAVED = { status: ["qualified"], has_decision_maker: true };

  beforeEach(() => {
    mockAuthUser = { id: "user-1", company_id: "company-a" };
  });

  it("al montar con algo guardado aplica los filtros desde la primera petición y el botón cuenta 2", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(SAVED));
    render(<LeadsInboxView />);
    await screen.findByText("Spa Piel de Seda");

    // Ni una sola petición sin filtros: si saliera, su respuesta podría pisar la buena.
    expect(api.listLeads).toHaveBeenCalledTimes(1);
    expect(api.listLeads).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, status: "qualified", has_decision_maker: true }),
    );
    expect(screen.getByRole("button", { name: "Filtros (2 activos)" })).toBeInTheDocument();
  });

  it("los filtros de otra empresa no se aplican", async () => {
    window.localStorage.setItem("axi:captacion:filtros:v1:company-b:user-1", JSON.stringify(SAVED));
    render(<LeadsInboxView />);
    await screen.findByText("Spa Piel de Seda");

    expect(api.listLeads).toHaveBeenCalledWith(expect.not.objectContaining({ status: "qualified" }));
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  });

  it("una opción guardada que ya no existe se descarta sin romper nada", async () => {
    window.localStorage.setItem(KEY, JSON.stringify({ status: ["qualified", "ya_no_existe"], source: "foo" }));
    render(<LeadsInboxView />);
    await screen.findByText("Spa Piel de Seda");

    expect(api.listLeads).toHaveBeenCalledWith(expect.objectContaining({ status: "qualified" }));
    expect(api.listLeads).toHaveBeenCalledWith(expect.not.objectContaining({ source: expect.anything() }));
    expect(screen.getByRole("button", { name: "Filtros (1 activos)" })).toBeInTheDocument();
  });

  it("cambiar de página conserva los filtros", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(SAVED));
    api.listLeads.mockResolvedValue({
      data: [lead(), lead({ id: "l2", display_name: "Centro Láser Laureles" })],
      meta: { total: 60, page: 1, page_size: 25 },
    });
    render(<LeadsInboxView />);
    await screen.findByText("Spa Piel de Seda");

    fireEvent.click(screen.getByLabelText("Ir a la página siguiente"));
    await waitFor(() =>
      expect(api.listLeads).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2, status: "qualified", has_decision_maker: true }),
      ),
    );
    expect(screen.getByRole("button", { name: "Filtros (2 activos)" })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual(SAVED);
  });

  it("poner un filtro lo guarda, y «Limpiar todo» borra lo guardado", async () => {
    render(<LeadsInboxView />);
    await screen.findByText("Spa Piel de Seda");

    fireEvent.click(screen.getByRole("button", { name: "Con quien decide" }));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem(KEY) ?? "null")).toEqual({ has_decision_maker: true }),
    );

    window.localStorage.setItem(KEY, JSON.stringify(SAVED));
    cleanup();
    render(<LeadsInboxView />);
    await screen.findByRole("button", { name: "Filtros (2 activos)" });

    fireEvent.click(screen.getByRole("button", { name: "Limpiar todo" }));
    await waitFor(() => expect(window.localStorage.getItem(KEY)).toBeNull());
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument();
  });
});
