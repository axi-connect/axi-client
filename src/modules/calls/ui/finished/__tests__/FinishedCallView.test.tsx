import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { CallSessionDetailDTO } from "@/modules/calls/domain/call";
import { FinishedCallView } from "../FinishedCallView";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));
jest.mock("@/modules/calls/infrastructure/services/calls-service.adapter", () => ({
  getCallRecordingUrl: () => Promise.resolve({ url: "https://storage/rec.mp3", expires_in_seconds: 300 }),
}));

beforeAll(() => {
  // jsdom no implementa la reproducción.
  jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  jest.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
  // Los picos no se pueden leer en jsdom: la onda cae a su línea plana.
  globalThis.fetch = jest.fn(() => Promise.reject(new Error("sin red"))) as unknown as typeof fetch;
});

const AT = "2026-09-26T14:12:04.000Z";

function call(overrides: Partial<CallSessionDetailDTO> = {}): CallSessionDetailDTO {
  return {
    id: "call-1",
    direction: "outbound",
    purpose: "appointment_reminder",
    mode: "reactive",
    call_type: null,
    last_stage: null,
    status: "completed",
    outcome: "goal_met",
    answered_by: "human",
    inbound_message: false,
    inbound_message_reason: null,
    contact: { id: "contact-1", name: "Laura Gómez" },
    from_number: "+576015803300",
    to_number: "+573002194410",
    ai_agent_id: "agent-1",
    ai_agent_name: "Sofía",
    attempt: 1,
    duration_seconds: 118,
    has_recording: true,
    cost_estimate_usd: 0.14,
    started_at: AT,
    ended_at: "2026-09-26T14:14:13.000Z",
    created_at: AT,
    metered_seconds: 120,
    recording_duration_seconds: 118,
    summary: "Laura confirmó y movió su cita a las 2:30 p. m.",
    recording_offset_ms: 2_000,
    segments: [
      { seq: 1, role: "agent", text: "Hola, ¿hablo con Laura?", at_ms: 6_000, spoken_at_ms: 1_000, interrupted: false },
      { seq: 2, role: "caller", text: "Sí, con ella.", at_ms: 9_000, spoken_at_ms: 7_000, interrupted: false },
      { seq: 3, role: "agent", text: "Tengo un espacio a las 2:30.", at_ms: 20_000, spoken_at_ms: 12_000, interrupted: false },
    ],
    events: [
      { type: "turn_completed", payload: { latency: { total_turn_ms: 900 } }, created_at: AT },
      { type: "turn_completed", payload: { latency: { total_turn_ms: 4_600 } }, created_at: AT },
      { type: "goal_assessment", payload: { met: true, confidence: 0.9, reason: "aceptó el horario" }, created_at: AT },
    ],
    playbook: null,
    stage_route: [],
    ...overrides,
  };
}

/** Render + la URL firmada que llega en una microtarea. */
async function renderView(props: CallSessionDetailDTO) {
  render(<FinishedCallView call={props} />);
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("FinishedCallView (premium F4)", () => {
  it("cabecera con el resultado, isla con resumen y veredicto, y grabación", async () => {
    await renderView(call());
    expect(screen.getByRole("heading", { level: 1, name: "Laura Gómez" })).toBeInTheDocument();
    expect(screen.getAllByText("Objetivo cumplido").length).toBeGreaterThan(0);

    const islands = screen.getAllByRole("region", { name: "Así fue la llamada" });
    const island = islands[0] as HTMLElement;
    expect(within(island).getByText("Laura confirmó y movió su cita a las 2:30 p. m.")).toBeInTheDocument();
    expect(within(island).getByText("Meta cumplida · confianza alta")).toBeInTheDocument();
    expect(within(island).getByText("aceptó el horario")).toBeInTheDocument();

    const recording = screen.getByRole("region", { name: "Grabación" });
    expect(within(recording).getByRole("button", { name: "Escuchar la grabación" })).toBeInTheDocument();
    expect(within(recording).getByRole("slider", { name: "Posición de la grabación" })).toBeInTheDocument();
    expect(within(recording).getByRole("radiogroup", { name: "Velocidad de reproducción" })).toBeInTheDocument();
  });

  it("la conversación: hora en la grabación (spoken_at + desfase), latencias y saltar a una frase", async () => {
    await renderView(call());
    const conversation = screen.getByRole("region", { name: "La conversación" });

    // 7 s de spoken_at + 2 s de desfase
    expect(within(conversation).getByText("0:09")).toBeInTheDocument();
    expect(within(conversation).getByRole("button", { name: /0,9 segundos/ })).toBeInTheDocument();
    expect(within(conversation).getByRole("button", { name: /4,6 segundos, lenta/ })).toBeInTheDocument();

    const row = within(conversation).getByRole("button", { name: /Tengo un espacio a las 2:30/ });
    expect(row).not.toHaveAttribute("aria-current");
    fireEvent.click(row);
    expect(row).toHaveAttribute("aria-current", "true");
  });

  it("sin grabación: sin panel de audio y la conversación sin saltos", async () => {
    await renderView(call({ has_recording: false, recording_duration_seconds: null }));
    expect(screen.queryByRole("region", { name: "Grabación" })).not.toBeInTheDocument();
    const conversation = screen.getByRole("region", { name: "La conversación" });
    expect(within(conversation).queryByText("Toca una frase para escucharla")).not.toBeInTheDocument();
    expect(within(conversation).queryByRole("button", { name: /Hola, ¿hablo con Laura\?/ })).not.toBeInTheDocument();
  });

  it("una llamada sin conversación (buzón, sin respuesta) no tiene isla", async () => {
    await renderView(call({ outcome: "no_answer", summary: null, segments: [], events: [], has_recording: false }));
    expect(screen.queryByRole("region", { name: "Así fue la llamada" })).not.toBeInTheDocument();
    expect(screen.getByText("Esta llamada no tiene conversación: no hubo diálogo con el agente.")).toBeInTheDocument();
  });

  describe("plan de modos: la ruta de etapas", () => {
    const stage = (key: string, label: string) => ({ key, label, goal: "Meta.", advance_when: "Responde.", must: [], never: [] });
    const playbook = {
      call_type: "sales_followup",
      label: "Venta",
      version: 1,
      opening_guidance: "Saluda.",
      stages: [stage("apertura", "Apertura"), stage("propuesta", "Propuesta"), stage("cierre", "Cierre")],
    };

    it("A1: una proactiva que dejó mensaje en el buzón no «llegó» a ninguna etapa aunque la ruta traiga la sembrada", async () => {
      await renderView(
        call({
          mode: "proactive",
          call_type: "sales_followup",
          outcome: "voicemail",
          playbook,
          stage_route: ["apertura"],
          last_stage: null,
        }),
      );
      const island = screen.getAllByRole("region", { name: "Así fue la llamada" })[0] as HTMLElement;
      expect(within(island).queryByText(/Llegó a/)).toBeNull();
      expect(within(island).queryByText(/Se cortó en/)).toBeNull();
    });

    it("F-1: sin resumen ni veredicto, la ruta igual dice dónde se cortó", async () => {
      await renderView(
        call({
          mode: "proactive",
          call_type: "sales_followup",
          outcome: "hangup",
          summary: null,
          events: [],
          ended_at: "2026-09-20T10:00:00.000Z",
          playbook,
          stage_route: ["apertura", "propuesta"],
          last_stage: "propuesta",
        }),
      );
      const island = screen.getAllByRole("region", { name: "Así fue la llamada" })[0] as HTMLElement;
      expect(within(island).getByText("Se cortó en")).toBeInTheDocument();
      expect(within(island).getByText("Propuesta · 2 de 3")).toBeInTheDocument();
    });

    it("B3: si no cumplió, UNA fila «Se cortó en» con su posición", async () => {
      await renderView(
        call({
          mode: "proactive",
          call_type: "sales_followup",
          outcome: "agent_closed",
          events: [],
          playbook,
          stage_route: ["apertura", "propuesta"],
          last_stage: "propuesta",
        }),
      );
      const island = screen.getAllByRole("region", { name: "Así fue la llamada" })[0] as HTMLElement;
      expect(within(island).getByText("Se cortó en")).toBeInTheDocument();
      expect(within(island).getByText("Propuesta · 2 de 3")).toBeInTheDocument();
      expect(within(island).queryByText("Llegó a")).toBeNull();
    });
  });

  it("Entrega 2: el recado de una entrante se titula «Dejó un recado» y dice que la tarea quedó en el CRM", async () => {
    await renderView(
      call({
        direction: "inbound",
        purpose: "inbound",
        // M1: un recado por relay caído SÍ tiene agente; manda la marca del servidor.
        ai_agent_id: "agent-1",
        ai_agent_name: "Sofía",
        inbound_message: true,
        inbound_message_reason: "relay_unavailable",
        outcome: "callback_requested",
        summary: "Dejó un recado: «quiero cambiar mi cita del jueves»",
        segments: [{ seq: 1, role: "caller", text: "quiero cambiar mi cita del jueves", at_ms: 0, spoken_at_ms: null, interrupted: false }],
        events: [],
      }),
    );
    const island = screen.getAllByRole("region", { name: "Así fue la llamada" })[0] as HTMLElement;
    expect(within(island).getByRole("heading", { level: 2, name: "Dejó un recado" })).toBeInTheDocument();
    expect(within(island).getByText(/Recado transcrito por Axi/)).toBeInTheDocument();
  });

  it("F5 fase 2 (4): el recado de un número oculto no promete una tarea que no existe", async () => {
    await renderView(
      call({
        direction: "inbound",
        purpose: "inbound",
        contact: null,
        from_number: "anonymous",
        inbound_message: true,
        inbound_message_reason: "anonymous_caller",
        ai_agent_id: null,
        ai_agent_name: null,
        outcome: "callback_requested",
        summary: "Dejó un recado: «llámenme a este número»",
        segments: [{ seq: 1, role: "caller", text: "llámenme a este número", at_ms: 0, spoken_at_ms: null, interrupted: false }],
        events: [],
      }),
    );
    const island = screen.getAllByRole("region", { name: "Así fue la llamada" })[0] as HTMLElement;
    expect(within(island).getByText(/número oculto: no hay a quién devolver la llamada/)).toBeInTheDocument();
    expect(within(island).queryByText(/quedó en el CRM/)).toBeNull();
  });
});

