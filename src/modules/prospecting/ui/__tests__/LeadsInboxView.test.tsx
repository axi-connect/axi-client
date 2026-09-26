import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { LeadDTO } from "../../domain/lead";
import { useCaptureStats } from "../../infrastructure/stores/capture-stats.store";
import { LeadsInboxView } from "../LeadsInboxView";

/**
 * La bandeja tras el rediseño premium (F4a): el contador de la pestaña y el
 * embudo leen las mismas cifras, y la selección vive en la barra de tinta con
 * los tres botones diciendo cada uno SU número.
 */

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
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
