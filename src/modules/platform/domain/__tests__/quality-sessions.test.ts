import {
  canOperatorSend,
  describeSessionError,
  formatLatency,
  formatUsd,
  lastTappableMessageId,
  mergeTranscript,
  sessionStatusKey,
  sessionStatusLabel,
  spendPercent,
  tapSourceFor,
  type SessionMessage,
} from "../quality-sessions";
import { sessionPollInterval, SESSION_POLL_FAST_MS, SESSION_POLL_IDLE_MS } from "../polling";

function message(overrides: Partial<SessionMessage> = {}): SessionMessage {
  return {
    id: "0199-1",
    direction: "inbound",
    sender_type: "contact",
    agent_id: null,
    content_type: "text",
    body: "hola",
    provider_message_id: "sim-in:1",
    status: "received",
    created_at: "2026-09-24T10:00:00.000Z",
    interactive: null,
    interactive_reply: null,
    location: null,
    ...overrides,
  };
}

describe("estado de la sesión", () => {
  it("una sesión activa se etiqueta Activa y su chip es running", () => {
    expect(sessionStatusLabel({ status: "active", ended_reason: null })).toBe("Activa");
    expect(sessionStatusKey({ status: "active", ended_reason: null })).toBe("running");
  });
  it("el fin por tope va en ámbar (blocked), el normal en verde, el fallo en rojo", () => {
    expect(sessionStatusKey({ status: "ended", ended_reason: "spend_cap" })).toBe("blocked");
    expect(sessionStatusKey({ status: "ended", ended_reason: "operator" })).toBe("completed");
    expect(sessionStatusKey({ status: "ended", ended_reason: "failed" })).toBe("failed");
    expect(sessionStatusLabel({ status: "ended", ended_reason: "idle_timeout" })).toBe(
      "Cerrada por inactividad",
    );
  });
  it("el operador escribe si la sesión está activa y la conversación no se cerró", () => {
    expect(canOperatorSend({ status: "active", agent_state: "idle" })).toBe(true);
    expect(canOperatorSend({ status: "active", agent_state: "escalated" })).toBe(true);
    expect(canOperatorSend({ status: "active", agent_state: "closed" })).toBe(false);
    expect(canOperatorSend({ status: "ended", agent_state: "idle" })).toBe(false);
  });
});

describe("toques", () => {
  it("≤3 opciones sin descripción → button; más o con descripción → list (como WhatsApp Cloud)", () => {
    expect(tapSourceFor([{ id: "a", title: "A" }, { id: "b", title: "B" }])).toBe("button");
    expect(tapSourceFor([{ id: "a", title: "A", description: "x" }])).toBe("list");
    expect(tapSourceFor([1, 2, 3, 4].map((n) => ({ id: String(n), title: String(n) })))).toBe("list");
  });
  it("solo el último saliente con opciones es tocable", () => {
    const withOptions = (id: string) =>
      message({
        id,
        direction: "outbound",
        sender_type: "ai_agent",
        interactive: { body: "?", options: [{ id: "opt:a", title: "A" }] },
      });
    expect(lastTappableMessageId([withOptions("1"), message({ id: "2" })])).toBeNull();
    expect(lastTappableMessageId([withOptions("1"), withOptions("2")])).toBe("2");
    expect(
      lastTappableMessageId([withOptions("1"), message({ id: "3", direction: "outbound", sender_type: "ai_agent" })]),
    ).toBeNull();
  });
});

describe("transcript incremental", () => {
  it("fusiona el delta sin duplicar ids y conserva el orden", () => {
    const known = [message({ id: "1" }), message({ id: "2" })];
    const merged = mergeTranscript(known, [message({ id: "2" }), message({ id: "3" })]);
    expect(merged.map((m) => m.id)).toEqual(["1", "2", "3"]);
    expect(mergeTranscript(known, [])).not.toBe(known);
  });
});

describe("polling de la sesión", () => {
  const base = { reloginOpen: false } as const;
  it("rápido mientras el agente escribe, lento quieta, apagado terminada/oculta/re-login", () => {
    expect(sessionPollInterval({ ...base, status: "active", agentState: "thinking" })).toBe(SESSION_POLL_FAST_MS);
    expect(sessionPollInterval({ ...base, status: "active", agentState: "idle" })).toBe(SESSION_POLL_IDLE_MS);
    expect(sessionPollInterval({ ...base, status: "ended", agentState: "closed" })).toBe(false);
    expect(sessionPollInterval({ ...base, status: "active", agentState: "thinking", hidden: true })).toBe(false);
    expect(sessionPollInterval({ status: "active", agentState: "thinking", reloginOpen: true })).toBe(false);
  });
});

describe("formato y errores", () => {
  it("USD, latencia y porcentaje del tope", () => {
    expect(formatUsd(null)).toBe("—");
    expect(formatUsd(0.18)).toMatch(/0,18/);
    expect(formatLatency(6100)).toBe("6,1 s");
    expect(formatLatency(310)).toBe("310 ms");
    expect(spendPercent(0.5, 1)).toBe(50);
    expect(spendPercent(2, 1)).toBe(100);
    expect(spendPercent(null, 1)).toBeNull();
  });
  it("los 409 del simulacro se explican por code y details", () => {
    expect(describeSessionError({ code: "quality/session_spend_cap_exceeded", details: { reason: "daily_spend_cap" } })).toMatch(/diario/);
    expect(describeSessionError({ code: "quality/session_limit_reached", details: { scope: "tenant" } })).toMatch(/tenant/);
    expect(describeSessionError({ code: "quality/session_not_active", details: { reason: "closed_by_agent" } })).toMatch(/agente cerró/);
    expect(describeSessionError({ code: "otra/cosa" })).toBeNull();
    expect(describeSessionError(null)).toBeNull();
  });
});
