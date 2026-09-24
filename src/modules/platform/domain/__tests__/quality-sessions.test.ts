import {
  canOperatorSend,
  describeSessionError,
  formatLatency,
  formatUsd,
  isSettledMessage,
  lastMessageId,
  lastTappableMessageId,
  mergeTranscript,
  recognitionLabel,
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
    recognition: null,
    transcription: null,
    attachments: [],
    ...overrides,
  };
}

describe("reconocimiento (F2)", () => {
  const base = { kind: null, description: null, top_score: null, margin: null, degraded: false, latency_ms: null, error_reason: null, skip_reason: null, candidates: [] };
  it("omitido/fallido → ámbar con el motivo; done con candidato → ok con la confianza; done sin candidato → off", () => {
    expect(recognitionLabel({ ...base, status: "skipped", skip_reason: "disabled" })).toEqual({ text: "Reconocimiento apagado en este tenant", tone: "warn" });
    expect(recognitionLabel({ ...base, status: "failed", error_reason: "timeout" }).tone).toBe("warn");
    expect(recognitionLabel({ ...base, status: "done", kind: "product", candidates: [{ sku: "A", name: "A", score: 0.9, confidence: "high" }] })).toEqual({ text: "Reconocido · confianza alta", tone: "ok" });
    expect(recognitionLabel({ ...base, status: "done", kind: "product" })).toEqual({ text: "Sin coincidencia en el catálogo", tone: "off" });
    expect(recognitionLabel({ ...base, status: "done", kind: "other" }).text).toBe("No es un producto");
  });
});

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
  it("lastMessageId salta las burbujas optimistas (su id no existe en el servidor)", () => {
    expect(lastMessageId([])).toBeUndefined();
    expect(lastMessageId([message({ id: "1" }), message({ id: "pending-sim-in:9" })])).toBe("1");
    expect(lastMessageId([message({ id: "pending-sim-in:9" })])).toBeUndefined();
  });

  it("B2: el cursor no avanza sobre un medio sin asentar (adjunto, reconocimiento o transcripción pendientes)", () => {
    const attachment = { id: "att-1", mime_type: "image/jpeg", filename: "f.jpg", size_bytes: 10, url: "https://x/1" };
    const recognition = { status: "skipped" as const, skip_reason: "disabled", error_reason: null, kind: null, description: null, top_score: null, margin: null, degraded: false, latency_ms: null, candidates: [] };
    const bare = message({ id: "2", content_type: "image", body: null });
    // `now` a 10 s del mensaje: aún dentro de la gracia de N5
    const at = new Date("2026-09-24T10:00:10.000Z").getTime();
    expect(isSettledMessage(bare, at)).toBe(false);
    expect(isSettledMessage({ ...bare, attachments: [attachment] }, at)).toBe(false);
    expect(isSettledMessage({ ...bare, attachments: [attachment], recognition }, at)).toBe(true);
    const audio = message({ id: "3", content_type: "audio", body: null, attachments: [{ ...attachment, mime_type: "audio/ogg" }] });
    expect(isSettledMessage(audio, at)).toBe(false);
    expect(isSettledMessage({ ...audio, transcription: { status: "done", text: "hola", error_reason: null, audio_seconds: 1, latency_ms: 5 } }, at)).toBe(true);
    // N5: con el reconocimiento apagado nunca llega `recognition`; pasado un
    // minuto con adjunto se da por asentado para no clavar el cursor
    const old = { ...bare, attachments: [attachment], created_at: "2026-09-24T10:00:00.000Z" };
    expect(isSettledMessage(old, new Date("2026-09-24T10:00:30.000Z").getTime())).toBe(false);
    expect(isSettledMessage(old, new Date("2026-09-24T10:01:30.000Z").getTime())).toBe(true);
    // El cursor se queda en el último asentado: cada poll vuelve a traer la foto
    expect(lastMessageId([message({ id: "1" }), bare])).toBe("1");
    expect(lastMessageId([message({ id: "1" }), { ...bare, attachments: [attachment], recognition }])).toBe("2");
  });

  it("fusiona el delta sin duplicar ids, conserva el orden y REEMPLAZA lo que vuelve con más datos", () => {
    const known = [message({ id: "1" }), message({ id: "2", content_type: "image", body: null })];
    const richer = message({
      id: "2",
      content_type: "image",
      body: null,
      attachments: [{ id: "att-1", mime_type: "image/jpeg", filename: "f.jpg", size_bytes: 10, url: "https://x/1" }],
    });
    const merged = mergeTranscript(known, [richer, message({ id: "3" })]);
    expect(merged.map((m) => m.id)).toEqual(["1", "2", "3"]);
    expect(merged[1]?.attachments).toHaveLength(1);
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
    // QA-1: el alcance global da otro mensaje
    expect(describeSessionError({ code: "quality/session_limit_reached", details: { scope: "global" } })).toMatch(/plataforma/);
    expect(describeSessionError({ code: "quality/session_not_active", details: { reason: "closed_by_agent" } })).toMatch(/agente cerró/);
    expect(describeSessionError({ code: "otra/cosa" })).toBeNull();
    expect(describeSessionError(null)).toBeNull();
  });
});
