import type { CmoMessageDTO, CmoThreadDTO } from "@/modules/cmo/domain/cmo";
import { useCmoStore } from "../cmo.store";

/**
 * Las conversaciones con Axel en el store. Tres reglas que el conmutador da por
 * hechas: «Nueva» no crea nada en el servidor (el hilo nace con el primer
 * mensaje, o el menú se llenaría de conversaciones vacías), cambiar de hilo
 * nunca pisa un turno en vuelo, y si dos cambios se cruzan gana el último.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  sendMessage: jest.fn(),
  listThreads: jest.fn(),
  getTranscript: jest.fn(),
  archiveThread: jest.fn(),
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
  listThreads: jest.Mock;
  getTranscript: jest.Mock;
  archiveThread: jest.Mock;
  listProposals: jest.Mock;
  getCmoSettings: jest.Mock;
  getLatestBriefing: jest.Mock;
};

const thread = (id: string, at: string): CmoThreadDTO => ({
  id,
  title: `Hilo ${id}`,
  last_message_at: at,
  created_at: at,
});

const transcript = (body: string): CmoMessageDTO[] => [
  {
    id: `srv-${body}`,
    role: "axel",
    body,
    tool_calls: null,
    proposal_id: null,
    question: null,
    created_at: "2026-09-15T10:00:00.000Z",
  } as CmoMessageDTO,
];

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

beforeEach(() => {
  jest.clearAllMocks();
  useCmoStore.setState({
    thread: { id: "t1", messages: [], thinking: false },
    live: null,
    blocker: null,
    settled: {},
    threads: { status: "idle", data: null, error: null },
  });
  api.listProposals.mockResolvedValue([]);
  api.getCmoSettings.mockResolvedValue({ enabled: true, briefing_hour: 8 });
  api.getLatestBriefing.mockResolvedValue(null);
});

describe("load guarda las conversaciones", () => {
  it("las conserva para el conmutador y abre la más reciente", async () => {
    api.listThreads.mockResolvedValue([thread("t9", "2026-09-15T10:00:00Z"), thread("t8", "2026-09-14T10:00:00Z")]);
    api.getTranscript.mockResolvedValue(transcript("hola"));

    await useCmoStore.getState().load();

    const state = useCmoStore.getState();
    expect(state.threads.status).toBe("ready");
    expect(state.threads.data?.map((t) => t.id)).toEqual(["t9", "t8"]);
    expect(state.thread.id).toBe("t9");
    expect(state.thread.messages[0]?.body).toBe("hola");
  });
});

describe("newThread", () => {
  it("es local: no llama al servidor y deja el hilo sin id", () => {
    useCmoStore.setState({ settled: { p1: null }, live: { turn_id: "x", iteration: 0, text: "", steps: [], seq: 0 } });
    useCmoStore.getState().newThread();

    const state = useCmoStore.getState();
    expect(state.thread).toEqual({ id: null, messages: [], thinking: false });
    expect(state.live).toBeNull();
    expect(state.settled).toEqual({});
    expect(api.listThreads).not.toHaveBeenCalled();
  });

  it("el primer mensaje adopta el hilo que devuelve el servidor y refresca la lista", async () => {
    useCmoStore.getState().newThread();
    api.sendMessage.mockResolvedValue({
      thread_id: "t-nuevo",
      reply: "Listo.",
      tool_calls: [],
      proposal_id: null,
      turn_id: "turn",
      question: null,
    });
    api.listThreads.mockResolvedValue([thread("t-nuevo", "2026-09-15T10:00:00Z")]);

    await useCmoStore.getState().ask("Hola");

    const sent = api.sendMessage.mock.calls[0]?.[0] as { thread_id?: string };
    expect(sent.thread_id).toBeUndefined();
    expect(useCmoStore.getState().thread.id).toBe("t-nuevo");
    expect(api.listThreads).toHaveBeenCalledTimes(1);
  });
});

describe("selectThread", () => {
  it("carga el transcript y resetea lo que era del hilo anterior", async () => {
    useCmoStore.setState({ settled: { p1: null }, blocker: "quota" });
    api.getTranscript.mockResolvedValue(transcript("otro"));

    await useCmoStore.getState().selectThread("t2");

    const state = useCmoStore.getState();
    expect(state.thread.id).toBe("t2");
    expect(state.thread.messages[0]?.body).toBe("otro");
    expect(state.settled).toEqual({});
    expect(state.blocker).toBeNull();
  });

  it("no hace nada mientras Axel trabaja ni si ya es el hilo actual", async () => {
    useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: true } });
    await useCmoStore.getState().selectThread("t2");
    expect(api.getTranscript).not.toHaveBeenCalled();

    useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: false } });
    await useCmoStore.getState().selectThread("t1");
    expect(api.getTranscript).not.toHaveBeenCalled();
  });

  it("si dos cambios se cruzan, gana el último", async () => {
    const slow = deferred<CmoMessageDTO[]>();
    api.getTranscript.mockImplementationOnce(() => slow.promise).mockResolvedValueOnce(transcript("rápido"));

    const first = useCmoStore.getState().selectThread("t-lento");
    await useCmoStore.getState().selectThread("t-rapido");
    slow.resolve(transcript("lento"));
    await first;

    const state = useCmoStore.getState();
    expect(state.thread.id).toBe("t-rapido");
    expect(state.thread.messages.map((m) => m.body)).toEqual(["rápido"]);
  });

  it("si el transcript falla, lo dice como aviso del sistema", async () => {
    api.getTranscript.mockRejectedValue(new Error("boom"));
    await useCmoStore.getState().selectThread("t2");
    expect(useCmoStore.getState().thread.messages[0]).toMatchObject({ role: "system" });
    expect(useCmoStore.getState().thread.messages[0]?.body).toMatch(/No pude abrir esta conversación/);
  });
});

describe("archiveThread", () => {
  it("quita el hilo de la lista al instante y, si era el abierto, salta al siguiente", async () => {
    useCmoStore.setState({
      threads: { status: "ready", data: [thread("t1", "2026-09-15T10:00:00Z"), thread("t2", "2026-09-14T10:00:00Z")], error: null },
    });
    api.archiveThread.mockResolvedValue(undefined);
    api.getTranscript.mockResolvedValue(transcript("t2"));

    await useCmoStore.getState().archiveThread("t1");

    expect(api.archiveThread).toHaveBeenCalledWith("t1");
    expect(useCmoStore.getState().threads.data?.map((t) => t.id)).toEqual(["t2"]);
    expect(useCmoStore.getState().thread.id).toBe("t2");
  });

  it("si el servidor falla, la lista vuelve a como estaba", async () => {
    const before = [thread("t1", "2026-09-15T10:00:00Z")];
    useCmoStore.setState({ threads: { status: "ready", data: before, error: null } });
    api.archiveThread.mockRejectedValue(new Error("boom"));

    await useCmoStore.getState().archiveThread("t1");

    expect(useCmoStore.getState().threads.data).toEqual(before);
    expect(useCmoStore.getState().threads.status).toBe("error");
  });

  it("archivar el único hilo abierto deja una conversación nueva en blanco", async () => {
    useCmoStore.setState({ threads: { status: "ready", data: [thread("t1", "2026-09-15T10:00:00Z")], error: null } });
    api.archiveThread.mockResolvedValue(undefined);

    await useCmoStore.getState().archiveThread("t1");

    expect(useCmoStore.getState().thread).toEqual({ id: null, messages: [], thinking: false });
  });
});
