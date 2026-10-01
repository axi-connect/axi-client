import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { itemFixture, mockupItems, routineFixture, runFixture } from "@/modules/autopilot/domain/__tests__/recorrido.fixtures";
import type { RunDetail, RunEvent } from "@/modules/autopilot/domain/autopilot";
import { RunLiveView } from "../RunLiveView";

/**
 * En vivo (U1, upgrade «el recorrido»): el recorrido con sus paradas y
 * salidas, la isla «Ahora» que se vuelve el lote al esperar tu aprobación, las
 * cuentas filtrables por etapa con el motivo en palabras y la bitácora.
 */
jest.mock("next/navigation", () => ({ usePathname: () => "/marketing/autopilot/runs/run-1", useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }));
jest.mock("@/modules/crm/public", () => ({
  listSequences: jest.fn(async () => ({ data: [{ id: "s-1", name: "Primer contacto · 4 pasos" }] })),
}));
jest.mock("@/modules/agents/public", () => ({ getTenantAgents: jest.fn(async () => [{ id: "a-1", name: "Sofía", status: "active" }]) }));
jest.mock("@/modules/autopilot/infrastructure/autopilot-service.adapter", () => ({
  getRun: jest.fn(),
  getRoutine: jest.fn(),
  getBatch: jest.fn(),
  listRunEvents: jest.fn(),
  decideBatch: jest.fn(),
  pauseRoutine: jest.fn(),
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

function given(run: RunDetail, { events = [] as RunEvent[], mode = "assisted" as "assisted" | "autonomous" } = {}) {
  api.getRun.mockResolvedValue(run);
  api.getRoutine.mockResolvedValue(routineFixture({ mode }));
  api.listRunEvents.mockResolvedValue({ items: events });
  const batch = run.items.filter((item) => item.stage === "contacting").map((item, index) => ({ ...item, display_name: `Persona ${String(index + 1)}`, score: 80 - index }));
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

describe("RunLiveView · el recorrido", () => {
  it("en ejecución: la isla dice qué hace y qué viene, el avión va en su tramo y las paradas llevan su cifra", async () => {
    given(runFixture({ step: "await_enrich", counters: { found: 25, qualified: 6 }, credits_spent: 6 }));
    render(<RunLiveView runId="run-1" />);

    const island = await screen.findByRole("region", { name: "Ahora" });
    expect(await within(island).findByText("Calificando y revelando quién decide")).toBeInTheDocument();
    expect(within(island).getByText(/Después: Pasar al CRM/)).toBeInTheDocument();
    expect(within(island).getByText("6 de 40 créditos · 34 de reserva")).toBeInTheDocument();
    expect(within(island).getByRole("meter", { name: "Créditos de esta ejecución" })).toHaveAttribute("aria-valuenow", "6");

    // El mapa (ancho) y la lista vertical comparten las paradas; el lector de pantalla las oye con su estado.
    expect(screen.getAllByText("Calificar y revelar: 6 cuentas, en curso").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Buscar: 25 cuentas, terminada").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tu aprobación: sin cifra, aún no llega/).length).toBeGreaterThan(0);
    expect(document.querySelector("[data-plane]")).not.toBeNull();
  });

  it("autónomo: no hay parada de tu aprobación", async () => {
    given(runFixture({ step: "approve", counters: { found: 25, qualified: 9, contacted: 3 } }), { mode: "autonomous" });
    render(<RunLiveView runId="run-1" />);
    await screen.findByRole("region", { name: "Ahora" });
    await waitFor(() => expect(screen.getAllByText(/^Inscribir en la secuencia: /).length).toBeGreaterThan(0));
    expect(screen.queryByText(/^Tu aprobación: /)).not.toBeInTheDocument();
  });

  it("espera tu aprobación: la isla ES el lote, con sus casillas, «Aprobar N y contactar», los canales y la secuencia", async () => {
    given(awaiting());
    api.decideBatch.mockResolvedValue({});
    render(<RunLiveView runId="run-1" />);

    const lot = await screen.findByRole("region", { name: "El lote espera tu aprobación" });
    expect(within(lot).getByText("7 cuentas")).toBeInTheDocument();
    expect(within(lot).getByRole("button", { name: /Aprobar 7 y contactar/ })).toBeInTheDocument();
    expect(within(lot).getByText("0 se omiten")).toBeInTheDocument();
    expect(within(lot).getByText("Correo")).toBeInTheDocument();
    expect(within(lot).getByText("Llamada del agente")).toBeInTheDocument();
    expect(await within(lot).findByText(/«Primer contacto · 4 pasos»/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ahora" })).not.toBeInTheDocument();

    fireEvent.click(within(lot).getByRole("checkbox", { name: /Aprobar Persona 2/ }));
    expect(within(lot).getByText("1 se omite")).toBeInTheDocument();
    fireEvent.click(within(lot).getByRole("button", { name: /Aprobar 6 y contactar/ }));

    await waitFor(() => expect(api.decideBatch).toHaveBeenCalledTimes(1));
    const [runId, decision] = api.decideBatch.mock.calls[0] as [string, { approve: string[]; skip: string[] }];
    expect(runId).toBe("run-1");
    expect(decision.approve).toHaveLength(6);
    expect(decision.skip).toHaveLength(1);
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ title: "Lote decidido" })));
  });

  it("las salidas se ven por su parada y las cuentas descartadas tienen filtro, con el motivo en palabras", async () => {
    given(awaiting());
    render(<RunLiveView runId="run-1" />);
    await screen.findByRole("region", { name: "El lote espera tu aprobación" });

    expect(screen.getAllByText("16 no pasaron tu filtro").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2 frenadas por tu política").length).toBeGreaterThan(0);

    const filters = screen.getByRole("group", { name: "Filtrar por etapa" });
    fireEvent.click(within(filters).getByRole("button", { name: /Descartado/ }));
    expect(within(filters).getByRole("button", { name: /Descartado/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ver las 18" }));
    expect(screen.getAllByText(/Puntaje por debajo de 60/).length).toBe(12);
    expect(screen.getByText(/Registro de Números Excluidos \(RNE\)/)).toBeInTheDocument();
    // Ninguna clave del motor llega a la pantalla.
    expect(document.body.textContent).not.toMatch(/policy_|below_min_score|no_decision_maker|skipped_in_batch/);
  });

  it("terminada: sin avión, todo recorrido, y la isla cuenta cuántas siguen la secuencia", async () => {
    given(
      runFixture({
        status: "done",
        step: "contact",
        counters: { found: 25, qualified: 9, blocked: 2, awaiting: 7, batch_skipped: 1, contacted: 6, promoted: 9 },
        credits_spent: 9,
      }),
    );
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("Terminada: 6 cuentas en seguimiento")).toBeInTheDocument();
    expect(document.querySelector("[data-plane]")).toBeNull();
    expect(screen.getAllByText("Inscribir en la secuencia: 6 cuentas, terminada").length).toBeGreaterThan(0);
  });

  it("terminada sin inscribir: la salida de «Inscribir» lleva su caja y la isla lo dice; nada sale «en seguimiento»", async () => {
    given(
      runFixture({
        status: "done",
        step: "contact",
        counters: { found: 25, qualified: 9, blocked: 2, awaiting: 7, promoted: 9, contacted: 0, enroll_skipped: 7 },
        credits_spent: 9,
        items: [...mockupItems().filter((item) => item.stage === "discarded"), ...Array.from({ length: 7 }, () => itemFixture("discarded", "enroll_no_channel", "approved"))],
      }),
    );
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("Terminada: no se pudo inscribir a nadie")).toBeInTheDocument();
    expect(screen.getAllByText("7 no se pudieron inscribir").length).toBe(2); // mapa y vertical
    expect(screen.getAllByText("Sin canal para la secuencia").length).toBe(2);
    expect(screen.queryByText("En seguimiento")).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/enroll_/);
  });

  it("el motivo de una salida se lee completo: sin recorte ni elipsis (RNE)", async () => {
    given(awaiting());
    render(<RunLiveView runId="run-1" />);
    await screen.findByRole("region", { name: "El lote espera tu aprobación" });
    for (const label of screen.getAllByText("Registro de Números Excluidos")) {
      expect(label.className).not.toMatch(/truncate|line-clamp/);
    }
  });

  it("falló: la parada donde iba queda en rojo y la isla dice el error", async () => {
    given(runFixture({ status: "failed", step: "await_search", counters: { found: 25 }, error: "search_timeout" }));
    render(<RunLiveView runId="run-1" />);
    // El error del motor es una clave: la isla lo cuenta en palabras.
    expect(await screen.findByText(/No se pudo leer la fuente: Google Maps no respondió/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("search_timeout");
    expect(screen.getAllByText(/^Completar datos: .*aquí se detuvo$/).length).toBeGreaterThan(0);
  });

  it.each([
    ["queued", "En cola: está por despegar"],
    ["paused", "Pausaste el piloto"],
    ["budget_exhausted", "Se acabó el tope de esta ejecución"],
  ] as const)("%s: la isla lo dice", async (status, title) => {
    given(runFixture({ status, step: status === "queued" ? null : "await_enrich", counters: { found: 25, qualified: 6 }, credits_spent: status === "budget_exhausted" ? 40 : 6 }));
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText(title)).toBeInTheDocument();
    if (status === "budget_exhausted") expect(screen.getByText("Llegó al tope")).toBeInTheDocument();
  });

  it("la bitácora narra cada paso con sus cifras", async () => {
    given(runFixture({ step: "promote", counters: { found: 25, qualified: 9 } }), {
      events: [
        event("step_completed", { step: "qualify", counters: { found: 25, qualified: 9, discarded: 16 }, credits_spent: 9 }),
        event("step_started", { step: "search" }, "2026-10-01T13:00:00Z"),
      ],
    });
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("Empezó: Buscar")).toBeInTheDocument();
    expect(screen.getByText(/^Calificar y revelar terminó/)).toBeInTheDocument();
  });

  it("con movimiento reducido el avión salta: no se anima con requestAnimationFrame", async () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} })) as never;
    const raf = jest.spyOn(window, "requestAnimationFrame");
    try {
      given(runFixture({ step: "await_enrich", counters: { found: 25, qualified: 6 } }));
      render(<RunLiveView runId="run-1" />);
      await screen.findByRole("region", { name: "Ahora" });
      await waitFor(() => expect(document.querySelector("[data-plane]")).not.toBeNull());
      expect(raf).not.toHaveBeenCalled();
    } finally {
      raf.mockRestore();
      window.matchMedia = original;
    }
  });

  it("sin el motor en el servidor: «llega con la próxima versión»", async () => {
    api.getRun.mockRejectedValue({ status: 404 });
    api.listRunEvents.mockResolvedValue({ items: [] });
    render(<RunLiveView runId="run-1" />);
    expect(await screen.findByText("El piloto llega con la próxima versión")).toBeInTheDocument();
  });
});
