import { render, screen, within } from "@testing-library/react";

import { listItemFixture, summaryFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { AutopilotListView } from "../AutopilotListView";

/**
 * Tus pilotos (U2): «Ahora mismo» solo si hay algo en vuelo o esperando, con el
 * botón al lote o a la ejecución en vivo; cada tarjeta cambia sus tres cifras
 * por el recorrido de la última ejecución.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }));
jest.mock("../proposals/PilotProposals", () => ({ PilotProposals: () => null }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  listRoutines: jest.fn(),
  pauseRoutine: jest.fn(),
  resumeRoutine: jest.fn(),
  runRoutineNow: jest.fn(),
  isAutopilotUnavailable: () => false,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

afterEach(() => jest.clearAllMocks());

describe("AutopilotListView · el recorrido", () => {
  it("un lote que espera: «Ahora mismo» lo dice y lleva al lote; la tarjeta enseña su recorrido", async () => {
    api.listRoutines.mockResolvedValue({
      items: [
        listItemFixture({
          last_run: summaryFixture({ id: "run-9", status: "awaiting_approval", step: "gate", counters: { found: 25, qualified: 9, blocked: 2, awaiting: 7 } }),
        }),
      ],
    });
    render(<AutopilotListView />);

    const ahora = await screen.findByRole("region", { name: "Ahora mismo" });
    expect(within(ahora).getByText(/lote espera tu aprobación · 7 cuentas/)).toBeInTheDocument();
    expect(within(ahora).getByRole("link", { name: "Revisar el lote" })).toHaveAttribute("href", "/marketing/autopilot/runs/run-9");

    const route = screen.getByRole("list", { name: "Recorrido de la última ejecución" });
    expect(within(route).getByText("Buscar: 25 cuentas")).toBeInTheDocument();
    expect(within(route).getByText("Tu aprobación: 7 cuentas")).toBeInTheDocument();
    expect(within(route).getByText("Inscribir en la secuencia: aún no llega")).toBeInTheDocument();
    // Las tres cifras sueltas («encontró · calificó · contactó») ya no van en la tarjeta: van en sus paradas.
    expect(screen.queryByText("Última ejecución")).not.toBeInTheDocument();
  });

  it("en vuelo: «Ahora mismo» lleva a la ejecución en vivo", async () => {
    api.listRoutines.mockResolvedValue({
      items: [listItemFixture({ last_run: summaryFixture({ id: "run-3", status: "running", step: "await_enrich", counters: { found: 25, qualified: 4 } }) })],
    });
    render(<AutopilotListView />);
    const ahora = await screen.findByRole("region", { name: "Ahora mismo" });
    expect(within(ahora).getByText(/en vuelo · calificar y revelar/)).toBeInTheDocument();
    expect(within(ahora).getByRole("link", { name: "Ver en vivo" })).toHaveAttribute("href", "/marketing/autopilot/runs/run-3");
  });

  it("nada en vuelo ni esperando: no hay «Ahora mismo»", async () => {
    api.listRoutines.mockResolvedValue({
      items: [
        listItemFixture({ last_run: summaryFixture({ status: "done", step: "contact", counters: { found: 25, qualified: 9, contacted: 6 } }) }),
        listItemFixture({ id: "r-2", name: "Hoteles", last_run: null }),
      ],
    });
    render(<AutopilotListView />);
    expect(await screen.findByText("Hoteles")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ahora mismo" })).not.toBeInTheDocument();
    // Un piloto sin ejecuciones no pinta recorrido.
    expect(screen.getAllByRole("list", { name: "Recorrido de la última ejecución" })).toHaveLength(1);
  });
});
