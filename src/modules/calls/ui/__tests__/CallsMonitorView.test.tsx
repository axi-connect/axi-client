import { act, render, screen, within } from "@testing-library/react";

import { CallsMonitorView } from "../CallsMonitorView";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: () => true }) }));
jest.mock("@/modules/calls/infrastructure/realtime/use-calls-socket", () => ({ useCallsSocket: () => undefined }));
jest.mock("@/modules/calls/infrastructure/realtime/use-live-call-preview", () => ({
  useLiveCallPreview: () => ({ mode: "agent", pulse: {}, line: { role: "agent", text: "Te confirmo la cita del jueves." } }),
}));
jest.mock("@/modules/calls/ui/components/TestCallDialog", () => ({ TestCallDialog: () => null }));

const live = {
  id: "call-live",
  direction: "outbound",
  purpose: "appointment_reminder",
  status: "in_progress",
  outcome: null,
  answered_by: "human",
  contact: { id: "c-1", name: "Laura Gómez" },
  from_number: "+576015803300",
  to_number: "+573002194410",
  ai_agent_id: "a-1",
  ai_agent_name: "Sofía",
  attempt: 1,
  duration_seconds: null,
  has_recording: false,
  cost_estimate_usd: null,
  started_at: new Date(Date.now() - 60_000).toISOString(),
  ended_at: null,
  created_at: new Date(Date.now() - 70_000).toISOString(),
};
let storeState = { calls: [live], initialized: true, error: null as string | null, fetchLive: jest.fn(() => Promise.resolve()) };
jest.mock("@/modules/calls/infrastructure/stores/live-calls.store", () => ({ useLiveCallsStore: () => storeState }));

const overview = {
  period: { start: new Date(Date.now() - 10 * 86_400_000).toISOString(), end: new Date(Date.now() + 20 * 86_400_000).toISOString() },
  kpis: { total: 212, inbound: 64, outbound: 148, answered: 148, no_answer: 41, voicemail: 23, failed: 2, goal_met: 61, connection_pct: 70, goal_met_pct: 41, avg_duration_seconds: 168 },
  previous: { total: 190, inbound: 60, outbound: 130, answered: 130, no_answer: 40, voicemail: 20, failed: 1, goal_met: 50, connection_pct: 68, goal_met_pct: 38, avg_duration_seconds: 160 },
  minutes: { used_seconds: 14_760, limit_seconds: 18_000 },
  series: [{ bucket_start: new Date().toISOString(), inbound: 3, outbound: 5 }],
};
const getCallsOverview = jest.fn();
const listCallSessions = jest.fn();
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  getCallsOverview: (...args: unknown[]) => getCallsOverview(...args),
  listCallSessions: (...args: unknown[]) => listCallSessions(...args),
}));

/** Una ficha del bento por su etiqueta (h2); la sección no lleva nombre propio. */
function tile(name: string): HTMLElement {
  const section = screen.getByRole("heading", { level: 2, name }).closest("section");
  if (section === null) throw new Error(`sin ficha ${name}`);
  return section;
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  });
}

describe("CallsMonitorView (premium F5)", () => {
  beforeEach(() => {
    storeState = { calls: [live], initialized: true, error: null, fetchLive: jest.fn(() => Promise.resolve()) };
    getCallsOverview.mockResolvedValue(overview);
    listCallSessions.mockImplementation((params: { outcome?: string }) =>
      Promise.resolve(
        params.outcome === "callback_requested"
          ? { data: [{ ...live, id: "cb-1", status: "completed", contact: { id: "c-2", name: "Andrés Pardo" } }], meta: { total: 1, page: 1, page_size: 3 } }
          : { data: [{ ...live, id: "done-1", status: "completed", outcome: "goal_met", duration_seconds: 192 }], meta: { total: 1, page: 1, page_size: 8 } },
      ),
    );
  });

  it("el bento: en curso con su aura, «Lo próximo», el ciclo, los minutos y lo último", async () => {
    render(<CallsMonitorView />);
    await flush();

    expect(screen.getByRole("heading", { level: 1, name: "Lo que tu agente logra al teléfono" })).toBeInTheDocument();
    const liveTile = tile("Al teléfono ahora");
    expect(within(liveTile).getByRole("link", { name: /Laura Gómez/ })).toHaveAttribute("href", "/calls/call-live");
    expect(within(liveTile).getByText("Habla Sofía")).toBeInTheDocument();
    expect(within(liveTile).getByText("«Te confirmo la cita del jueves.»")).toBeInTheDocument();

    const island = screen.getByRole("region", { name: "Lo próximo" });
    expect(within(island).getByRole("heading", { name: "Una persona espera tu llamada" })).toBeInTheDocument();
    expect(within(island).getByText("Andrés Pardo")).toBeInTheDocument();

    expect(screen.getByText("18 más que el ciclo anterior")).toBeInTheDocument();
    expect(screen.getByText("54 min")).toBeInTheDocument();
    const recent = tile("Terminadas hace poco");
    expect(within(recent).getByText("Objetivo cumplido")).toBeInTheDocument();
  });

  it("si el ciclo no carga, la isla no dice «Todo al día» y ofrece reintentar", async () => {
    getCallsOverview.mockRejectedValue(new Error("caído"));
    storeState = { ...storeState, calls: [] };
    render(<CallsMonitorView />);
    await flush();

    const island = screen.getByRole("region", { name: "Lo próximo" });
    expect(within(island).getByRole("heading", { name: "No pudimos revisar lo pendiente" })).toBeInTheDocument();
    expect(screen.queryByText("Todo al día")).not.toBeInTheDocument();
    expect(screen.getByText("Nadie está al teléfono")).toBeInTheDocument();
  });
});
