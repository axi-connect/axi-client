import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { routineFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { RoutineEditorView } from "../RoutineEditorView";

/**
 * El editor (R3): cuatro pasos plegables con su resumen, listas agrupadas
 * dentro, el modo en un SegmentedControl y «Así sale tu piloto» con la frase del
 * estimado. Al guardar con un error se abre su paso.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/r-1/edit", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
// Estables entre renders, como los de verdad: el editor relee el piloto si cambian.
const alert = { showAlert: jest.fn() };
const myCompany = { company: { timezone: "America/Bogota" } };
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => alert }));
jest.mock("@/modules/companies/public", () => ({ useMyCompany: () => myCompany }));
jest.mock("@/modules/crm/public", () => ({
  listSequences: jest.fn(async () => ({ data: [{ id: "s-1", name: "Primer contacto", is_active: true, steps: [{}, {}, {}, {}] }] })),
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

describe("RoutineEditorView · Piloto", () => {
  it("cuatro pasos cerrados con su resumen; abrir uno muestra sus listas", async () => {
    render(<RoutineEditorView routineId="r-1" />);
    const where = await screen.findByRole("button", { name: /¿Dónde busca\?/ });
    expect(where).toHaveAttribute("aria-expanded", "false");
    for (const title of [/¿A quién deja pasar\?/, /¿Cómo les escribe\?/, /¿Cuándo sale y cuánto gasta\?/]) {
      expect(screen.getByRole("button", { name: title })).toHaveAttribute("aria-expanded", "false");
    }
    fireEvent.click(screen.getByRole("button", { name: /¿Cómo les escribe\?/ }));
    expect(screen.getByRole("radiogroup", { name: "Antes de escribirles" })).toBeInTheDocument();
    expect(screen.getByText("Por dónde")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Correo" })).toBeChecked();
  });

  it("«Así sale tu piloto»: la frase del estimado, la aerovía vertical y el estimado del servidor", async () => {
    render(<RoutineEditorView routineId="r-1" />);
    const preview = await screen.findByRole("complementary", { name: "Así sale tu piloto" });
    expect(await within(preview).findByText("~396", { exact: false }, { timeout: 2000 })).toBeInTheDocument();
    expect(within(preview).getByText(/De 25 negocios/)).toBeInTheDocument();
    expect(within(preview).getByText("Tu aprobación")).toBeInTheDocument();
    expect(within(preview).getByText(/44 salidas · hasta 9 créditos por salida/)).toBeInTheDocument();
    // El estimado ya no se repite en una caja del paso 4.
    fireEvent.click(screen.getByRole("button", { name: /¿Cuándo sale y cuánto gasta\?/ }));
    expect(screen.getAllByText(/créditos al mes/).length).toBe(1);
  });

  it("«Por su cuenta» quita la parada de tu aprobación", async () => {
    render(<RoutineEditorView routineId="r-1" />);
    const preview = await screen.findByRole("complementary", { name: "Así sale tu piloto" });
    fireEvent.click(screen.getByRole("button", { name: /¿Cómo les escribe\?/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Por su cuenta" }));
    expect(within(preview).queryByText("Tu aprobación")).not.toBeInTheDocument();
  });

  it("un piloto con algo por corregir abre ese paso y lo marca", async () => {
    api.getRoutine.mockResolvedValue(routineFixture({ contact: { channels: [], agent_id: "a-1", goal: "Agendar" } }));
    render(<RoutineEditorView routineId="r-1" />);
    const how = await screen.findByRole("button", { name: /¿Cómo les escribe\?/ });
    await waitFor(() => expect(how).toHaveAttribute("aria-expanded", "true"));
    expect(how).toHaveTextContent(/tiene algo por corregir/);
    expect(screen.getByRole("button", { name: /¿Dónde busca\?/ })).toHaveAttribute("aria-expanded", "false");
  });
});
