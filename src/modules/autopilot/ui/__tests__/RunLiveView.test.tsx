import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { itemFixture, mockupItems, routineFixture, runFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import type { RunDetail, RunEvent } from "@/modules/autopilot/domain/autopilot";
import { RunLiveView } from "../RunLiveView";

/**
 * En vivo (Rutas de captación, R1): la cápsula de acciones en el encabezado
 * (con Reanudar), la tarjeta de la ruta con la frase de ahora en grande, las
 * paradas que filtran las cuentas, la isla «Tu aprobación» como única isla, las
 * cuentas con su SegmentedControl y «Paso a paso» plegado.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/runs/run-1", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const alert = { showAlert: jest.fn() };
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => alert }));
jest.mock("@/modules/crm/public", () => ({
  listSequences: jest.fn(async () => ({ data: [{ id: "s-1", name: "Primer contacto" }] })),
}));
jest.mock("@/modules/agents/public", () => ({ getTenantAgents: jest.fn(async () => [{ id: "a-1", name: "Sofía", status: "active" }]) }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  getRun: jest.fn(),
  getRoutine: jest.fn(),
  getBatch: jest.fn(),
  listRunEvents: jest.fn(),
  decideBatch: jest.fn(),
  pauseRoutine: jest.fn(),
  resumeRoutine: jest.fn(),
  runRoutineNow: jest.fn(),
  isAutopilotUnavailable: (caught: unknown) => (caught as { status?: number } | null)?.status === 404,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/autopilot-service.adapter") as Record<string, jest.Mock>;

const event = (kind: string, payload: Record<string, unknown>, at = "2026-10-01T13:06:00Z"): RunEvent => ({
  id: `e-${kind}-${String(payload.step ?? "")}`,
  item_id: null,
  kind,
  payload,
  request_id: null,
  created_at: at,
});

function given(
  run: RunDetail,
  { events = [] as RunEvent[], mode = "assisted" as "assisted" | "autonomous", status = "active" as "active" | "paused" } = {},
) {
  api.getRun.mockResolvedValue(run);
  api.getRoutine.mockResolvedValue(routineFixture({ mode, status }));
  api.listRunEvents.mockResolvedValue({ items: events });
  const batch = run.items
    .filter((item) => item.stage === "contacting")
    .map((item, index) => ({ ...item, display_name: `Persona ${String(index + 1)}`, score: 80 - index }));
  api.getBatch.mockResolvedValue({ items: batch });
}

const awaiting = () =>
  runFixture({
    status: "awaiting_approval",
    step: "gate",
    counters: { found: 25, qualified: 9, discarded: 18, blocked: 2, awaiting: 7, promoted: 9 },
    credits_spent: 9,
    items: mockupItems(),
  });

afterEach(() => jest.clearAllMocks());

describe("RunLiveView · Rutas de captación", () => {
  it("en ruta: la frase de ahora encabeza el mapa, Axi late y cada parada dice su cifra", async () => {
    given(runFixture({ step: "await_enrich", counters: { found: 25, qualified: 6 }, credits_spent: 6 }));
    render(<RunLiveView runId="run-1" />);

    const card = await screen.findByRole("region", { name: "La ruta de esta salida" });
    expect(await within(card).findByRole("heading", { level: 2 })).toHaveTextContent(/Calificando/);
    expect(within(card).getByText("En ruta")).toBeInTheDocument();
    expect(within(card).getByText("Con tu aprobación")).toBeInTheDocument();
    expect(within(card).getByRole("meter", { name: "Créditos de esta salida" })).toHaveAttribute("aria-valuenow", "6");
    expect(within(card).getByText(/6 de 40 créditos/)).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: /^Calificar: 6 cuentas, en curso\. Filtrar/ })).toBeInTheDocument();
    expect(document.querySelector('[data-axi="live"]')).not.toBeNull();
    // Sin lote no hay isla: la frase ya encabeza el mapa.
    expect(screen.queryByRole("region", { name: "Ahora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Tu aprobación" })).not.toBeInTheDocument();
  });

  it("la cápsula vive en el encabezado; la isla de tinta de abajo ya no está", async () => {
    given(runFixture({ step: "await_enrich", counters: { found: 25, qualified: 6 } }));
    render(<RunLiveView runId="run-1" />);
    const actions = await screen.findByRole("group", { name: "Acciones de la ruta" });
    expect(within(actions).getByRole("button", { name: /Pausar/ })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Salir ahora/ })).toBeDisabled();
    expect(within(actions).getByRole("link", { name: /Editar/ })).toHaveAttribute("href", "/marketing/autopilot/r-1/edit");
    expect(screen.queryByRole("region", { name: "Acciones del piloto" })).not.toBeInTheDocument();
  });

  it("pausada: Reanudar, y al reanudar se relee la ruta", async () => {
    given(runFixture({ status: "paused", step: "await_enrich", counters: { found: 25, qualified: 6 } }), { status: "paused" });
    api.resumeRoutine.mockResolvedValue({});
    render(<RunLiveView runId="run-1" />);
    const actions = await screen.findByRole("group", { name: "Acciones de la ruta" });
    expect(await screen.findByText("Pausaste la ruta")).toBeInTheDocument();
    fireEvent.click(within(actions).getByRole("button", { name: /Reanudar/ }));
    await waitFor(() => expect(api.resumeRoutine).toHaveBeenCalledWith("r-1"));
    await waitFor(() => expect(api.getRoutine).toHaveBeenCalledTimes(2));
  });

  it("autónomo: «Por su cuenta» y sin parada de tu aprobación", async () => {
    given(runFixture({ step: "approve", counters: { found: 25, qualified: 9, contacted: 3 } }), { mode: "autonomous" });
    render(<RunLiveView runId="run-1" />);
    const card = await screen.findByRole("region", { name: "La ruta de esta salida" });
    expect(await within(card).findByText("Por su cuenta")).toBeInTheDocument();
    expect(within(card).queryByRole("button", { name: /^Tu aprobación/ })).not.toBeInTheDocument();
  });

  it("espera tu aprobación: la isla del lote con sus casillas; quitar todas da «Omitir todas y seguir»", async () => {
    given(awaiting());
    api.decideBatch.mockResolvedValue({});
    render(<RunLiveView runId="run-1" />);

    const lot = await screen.findByRole("region", { name: "Tu aprobación" });
    expect(within(lot).getByText("7 cuentas")).toBeInTheDocument();
    expect(within(lot).getByText("Revisa a quién le escribe")).toBeInTheDocument();
    expect(await within(lot).findByText(/siguen «Primer contacto»/)).toBeInTheDocument();
    expect(within(lot).getByText("Ninguna se omite")).toBeInTheDocument();

    fireEvent.click(within(lot).getByRole("checkbox", { name: /Aprobar Persona 2/ }));
    expect(within(lot).getByText("1 se omite")).toBeInTheDocument();
    expect(within(lot).getByRole("button", { name: /Aprobar 6 y escribirles/ })).toBeInTheDocument();

    for (const box of within(lot).getAllByRole("checkbox")) if ((box as HTMLInputElement).checked) fireEvent.click(box);
    fireEvent.click(within(lot).getByRole("button", { name: "Omitir todas y seguir" }));
    await waitFor(() => expect(api.decideBatch).toHaveBeenCalledTimes(1));
    const [, decision] = api.decideBatch.mock.calls[0] as [string, { approve: string[]; skip: string[] }];
    expect(decision.approve).toHaveLength(0);
    expect(decision.skip).toHaveLength(7);
  });

  it("con lote, las cuentas abren en «Se quedaron», con el motivo en palabras y los desvíos con su caja", async () => {
    given(awaiting());
    render(<RunLiveView runId="run-1" />);
    await screen.findByRole("region", { name: "Tu aprobación" });

    const filter = screen.getByRole("radiogroup", { name: "Filtrar por etapa" });
    expect(within(filter).getByRole("radio", { name: /Se quedaron/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/Las 7 por aprobar están en la isla/)).toBeInTheDocument();
    expect(screen.getAllByText("16 no pasaron tu filtro").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Ver las 18/ }));
    expect(screen.getAllByText(/Puntaje por debajo de 60/).length).toBe(12);
    expect(document.body.textContent).not.toMatch(/policy_|below_min_score|no_decision_maker|skipped_in_batch/);
  });

  it("tocar una parada filtra las cuentas que llegaron ahí, y la marca se quita", async () => {
    given(awaiting());
    render(<RunLiveView runId="run-1" />);
    await screen.findByRole("region", { name: "Tu aprobación" });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Filtrar por etapa" })).getByRole("radio", { name: /Todas/ }));

    const stop = screen.getByRole("button", { name: /^Tu política: .*Filtrar/ });
    fireEvent.click(stop);
    expect(stop).toHaveAttribute("aria-pressed", "true");
    // Llegaron a la política: las 7 del lote y las 2 frenadas allí.
    expect(screen.getByText("Llegaron a «Tu política» · 9")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Quitar el filtro de la parada" }));
    expect(screen.queryByText(/Llegaron a/)).not.toBeInTheDocument();
  });

  it("terminada: «Lo que viene» cuenta seguimiento, respuestas y demos; Axi llegó", async () => {
    given(
      runFixture({
        status: "done",
        step: "contact",
        counters: { found: 25, qualified: 9, blocked: 2, awaiting: 7, contacted: 7, promoted: 9 },
        credits_spent: 9,
        items: [
          ...Array.from({ length: 4 }, () => itemFixture("following", null, "approved")),
          ...Array.from({ length: 2 }, () => itemFixture("replied", null, "approved")),
          itemFixture("demo", null, "approved"),
        ],
      }),
    );
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("Terminada: 7 cuentas en seguimiento")).toBeInTheDocument();
    // En el mapa («Lo que viene») y en la ruta vertical; «En seguimiento» también es la etapa de las cuentas.
    expect(screen.getAllByText("Lo que viene").length).toBe(2);
    expect(screen.getByText("Respondieron")).toBeInTheDocument();
    expect(screen.getByText("4 en seguimiento · 2 respondieron · 1 demo agendada")).toBeInTheDocument();
    expect(document.querySelector('[data-axi="live"]')).toBeNull();
  });

  it("falló: el error en palabras y «Salir de nuevo»", async () => {
    given(runFixture({ status: "failed", step: "await_search", counters: { found: 25 }, error: "search_timeout" }));
    api.runRoutineNow.mockResolvedValue({ run_id: "run-2" });
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText(/No se pudo leer la fuente: Google Maps no respondió/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("search_timeout");
    fireEvent.click(screen.getByRole("button", { name: /Salir de nuevo/ }));
    await waitFor(() => expect(api.runRoutineNow).toHaveBeenCalledWith("r-1"));
  });

  it.each([
    ["queued", "Sale en un momento"],
    ["budget_exhausted", /^Se acabó el tope/],
  ] as const)("%s: la frase lo dice", async (status, title) => {
    given(runFixture({ status, step: status === "queued" ? null : "await_enrich", counters: { found: 25, qualified: 6 }, credits_spent: status === "budget_exhausted" ? 40 : 0 }));
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    if (status === "budget_exhausted") expect(screen.getByText(/llegó al tope/)).toBeInTheDocument();
  });

  it("«Paso a paso» va plegado con cada línea de la bitácora", async () => {
    given(runFixture({ step: "promote", counters: { found: 25, qualified: 9 } }), {
      events: [
        event("step_completed", { step: "qualify", counters: { found: 25, qualified: 9, discarded: 16 }, credits_spent: 9 }),
        event("step_started", { step: "search" }, "2026-10-01T13:00:00Z"),
      ],
    });
    render(<RunLiveView runId="run-1" />);
    const summary = await screen.findByText("Paso a paso");
    const details = summary.closest("details");
    expect(details).not.toHaveAttribute("open");
    // Plegado no monta las líneas; al abrirlo, sí.
    expect(screen.queryByText("Empezó: Buscar")).not.toBeInTheDocument();
    if (details === null) throw new Error("sin details");
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(await screen.findByText("Empezó: Buscar")).toBeInTheDocument();
    expect(screen.getByText(/^Calificar terminó/)).toBeInTheDocument();
  });

  it("con movimiento reducido Axi salta: no se anima con requestAnimationFrame", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} })) as never;
    const raf = jest.spyOn(window, "requestAnimationFrame");
    try {
      given(runFixture({ step: "await_enrich", counters: { found: 25, qualified: 6 } }));
      render(<RunLiveView runId="run-1" />);
      await screen.findByRole("region", { name: "La ruta de esta salida" });
      await waitFor(() => expect(document.querySelector("[data-axi]")).not.toBeNull());
      expect(raf).not.toHaveBeenCalled();
    } finally {
      raf.mockRestore();
      window.matchMedia = original;
    }
  });

  it("sin el motor en el servidor: «llegan con la próxima versión»", async () => {
    api.getRun.mockRejectedValue({ status: 404 });
    api.listRunEvents.mockResolvedValue({ items: [] });
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("Las rutas llegan con la próxima versión")).toBeInTheDocument();
  });
});
