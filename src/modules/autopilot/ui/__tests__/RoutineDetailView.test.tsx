import { render, screen } from "@testing-library/react";

import { routineFixture, summaryFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { RoutineDetailView } from "../RoutineDetailView";

/**
 * La ficha del piloto (U4): cada ejecución con sus barras de encontradas,
 * calificadas y contactadas, a escala de la más ancha de la lista, y las
 * mismas cifras en texto.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/r-1", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  getRoutine: jest.fn(),
  listRuns: jest.fn(),
  isAutopilotUnavailable: () => false,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

afterEach(() => jest.clearAllMocks());

describe("RoutineDetailView · las barras de cada ejecución", () => {
  it("cada ejecución lleva sus tres barras y sus cifras; cero se ve como una marca", async () => {
    api.getRoutine.mockResolvedValue(routineFixture());
    api.listRuns.mockResolvedValue({
      items: [
        summaryFixture({ id: "run-1", status: "done", counters: { found: 20, qualified: 10, contacted: 5 }, credits_spent: 10 }),
        summaryFixture({ id: "run-2", status: "failed", counters: { found: 0 }, credits_spent: 0 }),
      ],
      next_cursor: null,
    });
    render(<RoutineDetailView routineId="r-1" />);

    expect(await screen.findByText(/20 encontradas · 10 calificadas · 5 contactadas/)).toBeInTheDocument();
    const bars = [...document.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars.map((bar) => bar.dataset.bar)).toEqual(["found", "qualified", "contacted", "found", "qualified", "contacted"]);
    // A escala de la más ancha: 20 es el 32 %, 10 la mitad, 5 la cuarta parte; los ceros, una marca de 2 px.
    expect(bars.slice(0, 3).map((bar) => bar.style.width)).toEqual(["32%", "16%", "8%"]);
    expect(bars.slice(3).map((bar) => bar.style.width)).toEqual(["2px", "2px", "2px"]);
  });
});
