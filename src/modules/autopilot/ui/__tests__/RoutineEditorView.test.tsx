import { fireEvent, render, screen, within } from "@testing-library/react";

import { routineFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { RoutineEditorView } from "../RoutineEditorView";

/**
 * El editor (U3): las seis decisiones de siempre y, al lado, «Así vuela tu
 * piloto», que arma el recorrido con el borrador y enseña la estimación del
 * servidor. Cambiar el modo pone o quita la parada de tu aprobación.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/r-1/edit", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
// Estables entre renders, como los de verdad: el editor relee el piloto si cambian.
const alert = { showAlert: jest.fn() };
const myCompany = { company: { timezone: "America/Bogota" } };
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => alert }));
jest.mock("@/modules/companies/public", () => ({ useMyCompany: () => myCompany }));
jest.mock("@/modules/crm/public", () => ({
  listSequences: jest.fn(async () => ({ data: [{ id: "s-1", name: "Primer contacto · 4 pasos", is_active: true, steps: [] }] })),
}));
jest.mock("@/modules/agents/public", () => ({ getTenantAgents: jest.fn(async () => [{ id: "a-1", name: "Sofía", status: "active" }]) }));
jest.mock("@/modules/prospecting/public", () => ({
  listSources: jest.fn(async () => ({
    items: [{ source: "google_places", provider: "google_places", label: "Google Maps", query_shape: "map", available: true, unavailable_reason: null, free: false, allowed_channels: ["email", "call"], attribution: null }],
    categories: [],
  })),
}));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  getRoutine: jest.fn(),
  estimateRoutine: jest.fn(),
  createRoutine: jest.fn(),
  updateRoutine: jest.fn(),
  isAutopilotUnavailable: () => false,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

beforeEach(() => {
  api.getRoutine.mockResolvedValue(routineFixture());
  api.estimateRoutine.mockResolvedValue({ credits_per_run: 9, credits_per_month: 396, runs_per_month: 44, leads_revealed_per_run: 9 });
});
afterEach(() => jest.clearAllMocks());

describe("RoutineEditorView · «Así vuela tu piloto»", () => {
  it("arma el recorrido con el borrador y enseña la estimación del servidor", async () => {
    render(<RoutineEditorView routineId="r-1" />);
    const preview = await screen.findByRole("complementary", { name: "Así vuela tu piloto" });

    expect(within(preview).getByText("Buscar")).toBeInTheDocument();
    expect(within(preview).getByText("Tu aprobación")).toBeInTheDocument();
    expect(within(preview).getByText(/Puntaje 60 o más/)).toBeInTheDocument();
    expect(await within(preview).findByText(/«Primer contacto · 4 pasos»/)).toBeInTheDocument();
    expect(await within(preview).findByText("~396 créditos al mes", undefined, { timeout: 2000 })).toBeInTheDocument();
    expect(within(preview).getByText(/44 ejecuciones · hasta 9 por ejecución · 9 cuentas reveladas por ejecución/)).toBeInTheDocument();
  });

  it("autónomo quita la parada de tu aprobación; el puntaje cae en su parada", async () => {
    render(<RoutineEditorView routineId="r-1" />);
    const preview = await screen.findByRole("complementary", { name: "Así vuela tu piloto" });

    fireEvent.click(screen.getByRole("radio", { name: /Autónomo/ }));
    expect(within(preview).queryByText("Tu aprobación")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Asistido/ }));
    expect(within(preview).getByText("Tu aprobación")).toBeInTheDocument();
  });
});
