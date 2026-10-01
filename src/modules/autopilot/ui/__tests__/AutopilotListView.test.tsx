import { render, screen, within } from "@testing-library/react";

import { listItemFixture, summaryFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import { AutopilotListView } from "../AutopilotListView";

/**
 * Tus pilotos (R2): «Ahora mismo» con Axi y una frase grande, solo si algo pide
 * atención; «Lo que trajeron tus pilotos» arriba de Axi propone; cada tarjeta con
 * su línea, su estado en texto (de la última salida), la miniatura y la
 * cápsula de acciones; y la lista escucha `item_moved`.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot", useRouter: () => ({ push: jest.fn() }) }));
const listeners: string[] = [];
jest.mock("@/core/realtime/use-socket", () => ({
  useSocket: () => ({ socket: null }),
  useSocketEvent: (_socket: unknown, name: string) => {
    listeners.push(name);
  },
}));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const alert = { showAlert: jest.fn() };
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => alert }));
jest.mock("../proposals/PilotProposals", () => ({ PilotProposals: () => <section aria-label="Axi propone" /> }));
jest.mock("../summary/PilotsSummaryCard", () => ({ PilotsSummaryCard: () => <section aria-label="Lo que trajeron tus pilotos" /> }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  listRoutines: jest.fn(),
  pauseRoutine: jest.fn(),
  resumeRoutine: jest.fn(),
  runRoutineNow: jest.fn(),
  isAutopilotUnavailable: () => false,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

afterEach(() => {
  jest.clearAllMocks();
  listeners.length = 0;
});

describe("AutopilotListView · Tus pilotos", () => {
  it("un lote que espera: «Ahora mismo» lo dice en grande y lleva al lote; la tarjeta enseña su línea", async () => {
    api.listRoutines.mockResolvedValue({
      items: [
        listItemFixture({
          last_run: summaryFixture({ id: "run-9", status: "awaiting_approval", step: "gate", counters: { found: 25, qualified: 9, blocked: 2, awaiting: 7 } }),
        }),
      ],
    });
    render(<AutopilotListView />);

    const ahora = await screen.findByRole("region", { name: "Ahora mismo" });
    expect(within(ahora).getByText("7 cuentas esperan tu aprobación")).toBeInTheDocument();
    expect(within(ahora).getByRole("link", { name: /Revisar el lote/ })).toHaveAttribute("href", "/marketing/autopilot/runs/run-9");

    expect(screen.getByRole("heading", { name: "Axi sale a buscar clientes por ti" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nuevo piloto/ })).toHaveAttribute("href", "/marketing/autopilot/new");
    expect(screen.getByRole("img", { name: /^La última salida: Buscar 25/ })).toBeInTheDocument();
    // La tarjeta del dueño: «Piloto · modo», la última salida en una línea, el botón de cristal líquido, las tres zonas y el avión en la línea.
    expect(screen.getByText("Piloto · con tu aprobación")).toBeInTheDocument();
    expect(screen.getByText(/^Espera tu aprobación · .* · 0 contactados · 0 créditos$/)).toBeInTheDocument();
    const lot = screen.getAllByRole("link", { name: /Revisar el lote/ });
    expect(lot.some((link) => link.className.includes("glass-control"))).toBe(true);
    for (const zone of ["Busca", "Cuándo y cuánto", "Modo"]) expect(screen.getByText(zone)).toBeInTheDocument();
    expect(screen.getByText("Restaurantes · Medellín")).toBeInTheDocument();
    expect(document.querySelector('[data-plane="still"]')).not.toBeNull();
    expect(screen.getAllByText("Espera tu aprobación").length).toBeGreaterThan(0);
    expect(within(screen.getByRole("group", { name: "Acciones del piloto" })).getByRole("button", { name: /Salir ahora/ })).toBeDisabled();
  });

  it("«Lo que trajeron tus pilotos» va arriba de Axi propone, y la lista escucha item_moved", async () => {
    api.listRoutines.mockResolvedValue({ items: [listItemFixture({ last_run: summaryFixture({ status: "done", step: "contact", counters: { found: 25, qualified: 9, contacted: 6 } }) })] });
    render(<AutopilotListView />);
    const summary = await screen.findByRole("region", { name: "Lo que trajeron tus pilotos" });
    const proposals = screen.getByRole("region", { name: "Axi propone" });
    expect(summary.compareDocumentPosition(proposals) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(listeners).toContain("autopilot.item_moved");
  });

  it("la píldora sale de la última salida: «Falló», no «Programado»", async () => {
    api.listRoutines.mockResolvedValue({
      items: [listItemFixture({ last_run: summaryFixture({ status: "failed", step: "await_search", error: "search_timeout", counters: { found: 0 } }) })],
    });
    render(<AutopilotListView />);
    // La píldora dice «Falló» y la línea de la última salida también lo cuenta.
    expect((await screen.findAllByText(/^Falló/)).length).toBe(2);
    expect(screen.queryByText("Programado")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ahora mismo" })).not.toBeInTheDocument();
  });

  it("pausado: «Pausado» y Reanudar en la cápsula", async () => {
    api.listRoutines.mockResolvedValue({ items: [listItemFixture({ status: "paused", last_run: null })] });
    render(<AutopilotListView />);
    expect(await screen.findByText("Pausado")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Acciones del piloto" })).getByRole("button", { name: /Reanudar/ })).toBeInTheDocument();
  });

  it("sin pilotos: «Tu primer piloto» y «Crear un piloto»", async () => {
    api.listRoutines.mockResolvedValue({ items: [] });
    render(<AutopilotListView />);
    expect(await screen.findByText("Tu primer piloto")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Crear un piloto/ })).toHaveAttribute("href", "/marketing/autopilot/new");
  });
});
