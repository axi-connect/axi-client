import type { CmoReplyDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore } from "../cmo.store";

/**
 * El turno en vivo, que es donde está el riesgo del módulo.
 *
 * Hay DOS caminos hacia el mismo mensaje —la respuesta del POST y el cierre por
 * WS— y el peligro no es que falte texto: es que sobre. Lo que se prueba aquí es
 * que la reconciliación siempre gane el POST, que nada se duplique y que un
 * evento repetido o desordenado no pinte dos veces.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  sendMessage: jest.fn(),
  listThreads: jest.fn(),
  createThread: jest.fn(),
  getTranscript: jest.fn(),
  listProposals: jest.fn(),
  getProposal: jest.fn(),
  approveProposal: jest.fn(),
  rejectProposal: jest.fn(),
  getCmoSettings: jest.fn(),
  getLatestBriefing: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/cmo/infrastructure/services/cmo-service.adapter") as {
  sendMessage: jest.Mock;
  listProposals: jest.Mock;
};

function reply(over: Partial<CmoReplyDTO> = {}): CmoReplyDTO {
  return {
    thread_id: "t1",
    reply: "Vas mejor en plata.",
    tool_calls: [{ name: "get_business_pulse", ms: 420, productive: true }],
    proposal_id: null,
    turn_id: "turn-server",
    ...over,
  };
}

/** El turno que la propia pestaña abrió, tal como lo dejó `ask`. */
function liveTurn(): { turn_id: string; seq: number } {
  const live = useCmoStore.getState().live;
  if (live === null) throw new Error("no hay turno en vivo");
  return { turn_id: live.turn_id, seq: live.seq };
}

function event<T extends Record<string, unknown>>(extra: T): T & Record<string, unknown> {
  const live = liveTurn();
  return {
    company_id: "c1",
    thread_id: "t1",
    turn_id: live.turn_id,
    ...extra,
  } as T & Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  useCmoStore.setState({
    thread: { id: "t1", messages: [], thinking: false },
    live: null,
    blocker: null,
    settled: {},
  });
  api.listProposals.mockResolvedValue([]);
});

/** Deja los ajustes cargados, como después de `load()`. */
function withServerBudget(ms: number): void {
  useCmoStore.setState({
    settings: { status: "ready", data: { turn_timeout_ms: ms } as never, error: null },
  });
}

describe("ask", () => {
  it("propone el id del turno y abre el estado en vivo antes de esperar nada", async () => {
    let openWhileInFlight: string | null = null;
    api.sendMessage.mockImplementation(() => {
      openWhileInFlight = useCmoStore.getState().live?.turn_id ?? null;
      return Promise.resolve(reply());
    });

    await useCmoStore.getState().ask("¿Cómo vamos?");

    const sent = api.sendMessage.mock.calls[0]?.[0] as { client_turn_id: string };
    // El id viaja en la petición: es lo que ata los eventos que ya están
    // llegando a ESTA pregunta.
    expect(sent.client_turn_id).toBe(openWhileInFlight);
    expect(sent.client_turn_id).toMatch(/^[0-9a-f-]{36}$/);
    // Y el presupuesto: sin señal, un POST colgado se queda colgado.
    expect(api.sendMessage.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
  });

  it("la respuesta del POST cierra el turno y deja el mensaje con su traza", async () => {
    api.sendMessage.mockResolvedValue(reply());
    await useCmoStore.getState().ask("¿Cómo vamos?");

    const state = useCmoStore.getState();
    expect(state.live).toBeNull();
    expect(state.thread.messages).toHaveLength(2);
    expect(state.thread.messages[1]).toMatchObject({
      role: "axel",
      body: "Vas mejor en plata.",
    });
    expect(state.thread.messages[1]?.tool_calls).toHaveLength(1);
  });
});

describe("presupuesto de espera", () => {
  it("sale del servidor, no de una constante del cliente", async () => {
    // Subir CMO_TURN_TIMEOUT_MS ya no deja al navegador abortando antes de tiempo.
    withServerBudget(180_000);
    let signal: AbortSignal | undefined;
    api.sendMessage.mockImplementation((_dto: unknown, s: AbortSignal) => {
      signal = s;
      return Promise.resolve(reply());
    });

    await useCmoStore.getState().ask("¿Cómo vamos?");
    expect(signal).toBeInstanceOf(AbortSignal);
    expect(signal?.aborted).toBe(false);
  });

  it("un turno abandonado por tiempo NO se anuncia como avería, y en español", async () => {
    api.sendMessage.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );
    await useCmoStore.getState().ask("¿Cómo vamos?");

    const failed = useCmoStore.getState().thread.messages[0]?.failed ?? "";
    // Antes salía el mensaje del navegador, en inglés, con un botón de reintentar
    // al lado que cuesta otro análisis.
    expect(failed).not.toContain("timed out");
    expect(failed).toContain("aparece sola");
    expect(useCmoStore.getState().live).toBeNull();
  });
});

describe("eventos en vivo", () => {
  /** Deja la pestaña con un turno abierto y el POST sin resolver. */
  async function inFlight(): Promise<{ resolve: (value: CmoReplyDTO) => void; done: Promise<void> }> {
    let resolve: (value: CmoReplyDTO) => void = () => undefined;
    api.sendMessage.mockImplementation(
      () =>
        new Promise<CmoReplyDTO>((ok) => {
          resolve = ok;
        }),
    );
    const done = useCmoStore.getState().ask("¿Cómo vamos?");
    // Un tick para que `ask` haya hecho su `set` inicial.
    await Promise.resolve();
    return { resolve, done };
  }

  it("acumula el texto y descarta lo repetido o desordenado", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    store.onTurnDelta(event({ seq: 2, iteration: 1, text: "Vas " }) as never);
    store.onTurnDelta(event({ seq: 3, iteration: 1, text: "mejor" }) as never);
    // Reentrega de una reconexión: mismo seq → se ignora, o el texto se duplica.
    store.onTurnDelta(event({ seq: 3, iteration: 1, text: "mejor" }) as never);
    store.onTurnDelta(event({ seq: 1, iteration: 1, text: "TARDE" }) as never);

    expect(useCmoStore.getState().live?.text).toBe("Vas mejor");
    turn.resolve(reply());
    await turn.done;
  });

  it("una iteración nueva descarta el preámbulo: no era la respuesta", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    store.onTurnDelta(event({ seq: 2, iteration: 1, text: "Voy a mirarlo." }) as never);
    store.onTurnDelta(event({ seq: 3, iteration: 2, text: "Esto es lo que veo." }) as never);

    expect(useCmoStore.getState().live?.text).toBe("Esto es lo que veo.");
    turn.resolve(reply());
    await turn.done;
  });

  it("el paso terminado COMPLETA el que estaba corriendo, no añade una fila", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    store.onTurnStep(
      event({ seq: 2, name: "get_leaks", label: "Buscando fugas", state: "running", ms: null, productive: null }) as never,
    );
    store.onTurnStep(
      event({ seq: 3, name: "get_leaks", label: "Buscando fugas", state: "done", ms: 310, productive: true }) as never,
    );

    const steps = useCmoStore.getState().live?.steps ?? [];
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ done: true, ms: 310 });
    turn.resolve(reply());
    await turn.done;
  });

  it("un paso BORRA el preámbulo: lo que precede a una herramienta no es la respuesta", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    // La secuencia real de todo turno con herramientas: el modelo narra y llama.
    store.onTurnDelta(event({ seq: 2, iteration: 1, text: "Voy a revisar tu embudo." }) as never);
    store.onTurnStep(
      event({
        seq: 3,
        name: "get_business_pulse",
        label: "Leyendo tu embudo y tus ventas",
        state: "running",
        ms: null,
        productive: null,
      }) as never,
    );

    // Sin esto la vista daba prioridad al texto sobre los pasos, y esa frase se
    // quedaba fija con el cursor parpadeando durante toda la fase de lecturas.
    expect(useCmoStore.getState().live?.text).toBe("");
    expect(useCmoStore.getState().live?.steps).toHaveLength(1);
    turn.resolve(reply());
    await turn.done;
  });

  it("un evento de OTRO turno no toca nada", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    store.onTurnDelta({
      company_id: "c1",
      thread_id: "t1",
      turn_id: "otro-turno",
      seq: 99,
      iteration: 1,
      text: "de otra pestaña",
    });

    expect(useCmoStore.getState().live?.text).toBe("");
    turn.resolve(reply());
    await turn.done;
  });

  it("el cierre por WS inserta el mensaje y el POST lo COMPLETA sin duplicar", async () => {
    const turn = await inFlight();
    const store = useCmoStore.getState();

    store.onTurnCompleted(
      event({
        seq: 4,
        message_id: "m-real",
        body: "Vas mejor en plata.",
        proposal_id: null,
        tool_calls: 1,
      }) as never,
    );

    // Ya está en el hilo, sin traza (el evento solo trae el número).
    let state = useCmoStore.getState();
    expect(state.thread.messages).toHaveLength(2);
    expect(state.thread.messages[1]?.tool_calls).toBeNull();
    expect(state.live).toBeNull();

    turn.resolve(reply());
    await turn.done;

    // Y el POST lo completa EN SU SITIO: dos caminos, un solo mensaje.
    state = useCmoStore.getState();
    expect(state.thread.messages).toHaveLength(2);
    expect(state.thread.messages[1]?.tool_calls).toHaveLength(1);
  });

  it("si el POST muere después del cierre, la respuesta NO se marca como fallo", async () => {
    let reject: (reason: unknown) => void = () => undefined;
    api.sendMessage.mockImplementation(
      () =>
        new Promise<CmoReplyDTO>((_ok, ko) => {
          reject = ko;
        }),
    );
    const done = useCmoStore.getState().ask("¿Cómo vamos?");
    await Promise.resolve();

    useCmoStore.getState().onTurnCompleted(
      event({
        seq: 4,
        message_id: "m-real",
        body: "Vas mejor en plata.",
        proposal_id: null,
        tool_calls: 1,
      }) as never,
    );
    // El proxy cortó la conexión del POST a los 100 s. El análisis ya está
    // guardado: marcarlo como error invitaría a reintentar y pagar otro.
    reject(new Error("network"));
    await done;

    const state = useCmoStore.getState();
    expect(state.thread.messages[0]?.failed).toBeUndefined();
    expect(state.thread.messages).toHaveLength(2);
    expect(state.thread.thinking).toBe(false);
  });

  it("un turno que falla por cuota bloquea la pantalla con su motivo", async () => {
    const turn = await inFlight();
    useCmoStore.getState().onTurnFailed(event({ seq: 2, code: "cmo/quota_exhausted" }) as never);

    expect(useCmoStore.getState().blocker).toBe("quota");
    expect(useCmoStore.getState().live).toBeNull();
    turn.resolve(reply());
    await turn.done;
  });
});
