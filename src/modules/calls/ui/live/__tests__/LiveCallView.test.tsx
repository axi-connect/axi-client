import { render, screen, within } from "@testing-library/react";

import type { CallSessionDetailDTO } from "@/modules/calls/domain/call";
import { INITIAL_LIVE_CALL_PULSE } from "@/modules/calls/domain/live-call";
import { LiveCallView } from "../LiveCallView";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));
// El canvas no aporta nada en jsdom: se comprueba que recibe el modo.
jest.mock("@/modules/calls/ui/components/aura/CallAura", () => ({
  CallAura: ({ mode }: { mode: string }) => <div data-testid="aura" data-mode={mode} />,
}));

function call(overrides: Partial<CallSessionDetailDTO> = {}): CallSessionDetailDTO {
  return {
    id: "call-1",
    direction: "outbound",
    purpose: "appointment_reminder",
    status: "in_progress",
    outcome: null,
    answered_by: "human",
    contact: { id: "contact-1", name: "Laura Gómez" },
    from_number: "+576015803300",
    to_number: "+573002194410",
    ai_agent_id: "agent-1",
    ai_agent_name: "Sofía",
    attempt: 1,
    duration_seconds: null,
    has_recording: false,
    cost_estimate_usd: null,
    started_at: new Date(Date.now() - 161_000).toISOString(),
    ended_at: null,
    created_at: new Date(Date.now() - 170_000).toISOString(),
    metered_seconds: 120,
    recording_duration_seconds: null,
    summary: null,
    recording_offset_ms: null,
    segments: [
      { seq: 1, role: "agent", text: "Hola, ¿hablo con Laura Gómez?", at_ms: 2_000, spoken_at_ms: 2_000, interrupted: false },
      { seq: 2, role: "caller", text: "Sí, con ella.", at_ms: 9_000, spoken_at_ms: 7_000, interrupted: false },
    ],
    events: [],
    ...overrides,
  };
}

describe("LiveCallView (premium F3)", () => {
  it("cabecera, escenario con quién habla, conversación y el borrador del agente al final", () => {
    render(
      <LiveCallView
        call={call()}
        pulse={{
          ...INITIAL_LIVE_CALL_PULSE,
          hasSpeakerEvents: true,
          agentSpeaking: true,
          phase: "speaking",
          draft: { generation: 2, text: "Te llamo para confirmar tu cita." },
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Laura Gómez" })).toBeInTheDocument();
    expect(screen.getByText("En conversación")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver contacto" })).toHaveAttribute("href", "/crm/contacts/contact-1");

    const stage = screen.getByRole("region", { name: "La llamada en vivo" });
    expect(within(stage).getByText("Habla Sofía")).toBeInTheDocument();
    expect(within(stage).getByText("2:41")).toBeInTheDocument();
    expect(screen.getByTestId("aura")).toHaveAttribute("data-mode", "agent");

    const conversation = screen.getByRole("region", { name: "La conversación" });
    const list = within(conversation).getByRole("list");
    expect(list).toHaveAttribute("aria-live", "polite");
    // Lo definitivo se anuncia; el borrador va fuera de la lista anunciada
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByText("0:07")).toBeInTheDocument(); // spoken_at_ms, no at_ms
    expect(within(conversation).getByText("· ahora")).toBeInTheDocument();
    expect(within(conversation).getByText("2 turnos")).toBeInTheDocument();
  });

  it("mientras timbra: el estado real en el reloj, «Llamando…» y el aura en silencio", () => {
    render(
      <LiveCallView
        call={call({ status: "ringing", started_at: null, segments: [] })}
        pulse={INITIAL_LIVE_CALL_PULSE}
      />,
    );
    const stage = screen.getByRole("region", { name: "La llamada en vivo" });
    expect(within(stage).getByText("Llamando…")).toBeInTheDocument();
    expect(within(stage).getAllByText("Timbrando").length).toBeGreaterThan(0);
    expect(screen.getByTestId("aura")).toHaveAttribute("data-mode", "idle");
    expect(screen.getByText("Esperando la conversación…")).toBeInTheDocument();
    expect(screen.getByText("Aún no contesta")).toBeInTheDocument();
  });

  it("sin contacto en el CRM: el número como título y sin «Ver contacto»", () => {
    render(<LiveCallView call={call({ contact: null })} pulse={INITIAL_LIVE_CALL_PULSE} />);
    expect(screen.getByRole("heading", { level: 1, name: "+573002194410" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Ver contacto" })).not.toBeInTheDocument();
  });
});
