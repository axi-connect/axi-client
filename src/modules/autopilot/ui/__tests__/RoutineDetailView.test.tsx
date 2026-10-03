import { render, screen, within } from "@testing-library/react";

import { routineFixture, summaryFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { RoutineDetailView } from "../RoutineDetailView";

/**
 * La ficha del piloto (R4): la cápsula de acciones que aquí faltaba, las tres
 * fichas (Busca · Antes de escribirles · Próxima salida) y cada salida con su
 * cinta de embudo; «Falló» lo dice en palabras.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/r-1", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const alert = { showAlert: jest.fn() };
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => alert }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  getRoutine: jest.fn(),
  listRuns: jest.fn(),
  pauseRoutine: jest.fn(),
  resumeRoutine: jest.fn(),
  runRoutineNow: jest.fn(),
  isAutopilotUnavailable: () => false,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

afterEach(() => jest.clearAllMocks());

describe("RoutineDetailView · la ficha del piloto", () => {
  it("la cápsula, las fichas y una cinta por salida; la que falló lo dice en palabras", async () => {
    api.getRoutine.mockResolvedValue(routineFixture());
    api.listRuns.mockResolvedValue({
      items: [
        summaryFixture({ id: "run-1", status: "done", counters: { found: 20, qualified: 10, contacted: 5 }, credits_spent: 10 }),
        summaryFixture({ id: "run-2", status: "failed", error: "search_timeout", step: "await_search", counters: { found: 0 }, credits_spent: 0 }),
      ],
      next_cursor: null,
    });
    render(<RoutineDetailView routineId="r-1" />);

    const actions = await screen.findByRole("group", { name: "Acciones del piloto" });
    expect(within(actions).getByRole("button", { name: /Pausar/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Salir ahora/ })).toBeEnabled();
    expect(screen.getByText("Antes de escribirles")).toBeInTheDocument();
    expect(screen.getByText("Con tu aprobación")).toBeInTheDocument();
    expect(screen.getByText(/Tope mensual: 600 créditos/)).toBeInTheDocument();

    expect(screen.getByText(/20 encontradas · 10 calificadas · 5 contactadas/)).toBeInTheDocument();
    expect(document.querySelectorAll("[data-ribbon]")).toHaveLength(1);
    expect(screen.getByText(/No se pudo leer la fuente/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("search_timeout");
    expect(screen.getByText("10 créditos")).toBeInTheDocument();
    expect(screen.getByText("0 créditos")).toBeInTheDocument();
  });

  it("con más salidas por cargar del mismo mes, «van N» no se dice (se quedaría corto)", async () => {
    api.getRoutine.mockResolvedValue(routineFixture());
    api.listRuns.mockResolvedValue({
      items: [summaryFixture({ id: "run-1", status: "done", counters: { found: 5 }, credits_spent: 3, created_at: new Date().toISOString() })],
      next_cursor: "c2",
    });
    render(<RoutineDetailView routineId="r-1" />);
    expect(await screen.findByText("Tope mensual: 600 créditos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver más salidas" })).toBeInTheDocument();
  });
});
