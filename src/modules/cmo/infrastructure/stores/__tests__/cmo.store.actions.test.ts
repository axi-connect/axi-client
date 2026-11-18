import type { AssistantActionDTO, CmoMessageDTO, CmoReplyDTO } from "@/modules/cmo/domain/cmo";
import { HttpError } from "@/core/api/problem";
import { anchorActions, useCmoStore, type UiAction, type UiMessage } from "../cmo.store";

/**
 * Las acciones que Axel deja preparadas (F3 «Axel OS») en el store. Lo que se
 * protege: la tarjeta nace con la respuesta del turno, el diff llega después,
 * nada se marca hecho antes de que el servidor lo diga, un `forbidden` no se
 * pierde al releer, y al recargar un hilo cada acción vuelve a su mensaje.
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
  listActions: jest.fn(),
  confirmAction: jest.fn(),
  rejectAction: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/cmo/infrastructure/services/cmo-service.adapter") as {
  sendMessage: jest.Mock;
  listThreads: jest.Mock;
  getTranscript: jest.Mock;
  listProposals: jest.Mock;
  listActions: jest.Mock;
  confirmAction: jest.Mock;
  rejectAction: jest.Mock;
};

function dto(patch: Partial<AssistantActionDTO> = {}): AssistantActionDTO {
  return {
    id: "a1",
    assistant: "axel",
    thread_id: "t1",
    tool: "catalog_update_product",
    risk: "write",
    status: "pending",
    preview: {
      summary: "Subir el precio del Kit Hidratante",
      lines: [{ label: "Precio", before: "$ 89.000", after: "$ 95.000" }],
      effects: null,
    },
    outcome_text: null,
    expires_at: "2099-01-01T00:00:00.000Z",
    decided_at: null,
    created_at: "2026-11-18T12:00:05.000Z",
    ...patch,
  };
}

function uiAction(patch: Partial<UiAction> = {}): UiAction {
  return {
    id: "a1",
    tool: "catalog_update_product",
    risk: "write",
    summary: "Subir el precio del Kit Hidratante",
    lines: null,
    effects: null,
    expires_at: null,
    phase: "pending",
    text: null,
    busy: null,
    error: null,
    ...patch,
  };
}

function message(id: string, role: UiMessage["role"], at: string, patch: Partial<UiMessage> = {}): UiMessage {
  return { id, role, body: id, created_at: at, tool_calls: null, proposal_id: null, question: null, ...patch };
}

/** Una promesa que se resuelve a mano: para mirar el estado A MITAD de la llamada. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const flush = () => new Promise((done) => setTimeout(done, 0));

beforeEach(() => {
  jest.clearAllMocks();
  useCmoStore.setState({
    thread: { id: "t1", messages: [], thinking: false },
    live: null,
    late: null,
    blocker: null,
    settled: {},
    actions: {},
  });
  api.listProposals.mockResolvedValue([]);
  api.listThreads.mockResolvedValue([]);
  api.listActions.mockResolvedValue([]);
});

describe("cmo.store · acciones preparadas", () => {
  it("la respuesta del turno ancla las acciones a su mensaje y trae el diff después", async () => {
    api.sendMessage.mockResolvedValueOnce({
      thread_id: "t1",
      reply: "Te dejé el cambio listo.",
      tool_calls: [],
      proposal_id: null,
      turn_id: "turn",
      question: null,
      pending_actions: [{ id: "a1", tool: "catalog_update_product", risk: "write", summary: "Subir el precio" }],
    } as CmoReplyDTO);
    api.listActions.mockResolvedValueOnce([dto()]);

    await useCmoStore.getState().ask("Sube el kit a 95 mil");
    await flush();

    const state = useCmoStore.getState();
    const answer = state.thread.messages.at(-1);
    expect(answer?.role).toBe("axel");
    expect(answer?.action_ids).toEqual(["a1"]);
    expect(api.listActions).toHaveBeenCalledWith("t1");
    expect(state.actions.a1?.lines).toEqual([{ label: "Precio", before: "$ 89.000", after: "$ 95.000" }]);
    expect(state.actions.a1?.phase).toBe("pending");
  });

  it("un turno sin acciones no pide la lista", async () => {
    api.sendMessage.mockResolvedValueOnce({
      thread_id: "t1",
      reply: "Vas bien.",
      tool_calls: [],
      proposal_id: null,
      turn_id: "turn",
      question: null,
    } as CmoReplyDTO);
    await useCmoStore.getState().ask("¿Cómo vamos?");
    expect(api.listActions).not.toHaveBeenCalled();
    expect(useCmoStore.getState().thread.messages.at(-1)?.action_ids).toBeUndefined();
  });

  it("confirmar: en vuelo mientras va, ejecutada SOLO cuando el servidor responde", async () => {
    useCmoStore.setState({ actions: { a1: uiAction() } });
    const call = deferred<unknown>();
    api.confirmAction.mockReturnValueOnce(call.promise);

    const running = useCmoStore.getState().confirmAction("a1");
    expect(useCmoStore.getState().actions.a1).toMatchObject({ busy: "confirm", phase: "pending" });

    // Un segundo toque mientras va no sale.
    await useCmoStore.getState().confirmAction("a1");
    expect(api.confirmAction).toHaveBeenCalledTimes(1);

    call.resolve({ action_id: "a1", outcome: "executed", text: "Listo: quedó en $ 95.000." });
    await running;
    expect(useCmoStore.getState().actions.a1).toMatchObject({
      busy: null,
      phase: "executed",
      text: "Listo: quedó en $ 95.000.",
    });
  });

  it("forbidden: la acción queda «sin permiso» con el texto del servidor, y una relectura no lo borra", async () => {
    useCmoStore.setState({ actions: { a1: uiAction() } });
    api.confirmAction.mockResolvedValueOnce({
      action_id: "a1",
      outcome: "forbidden",
      text: "Tu rol no puede editar productos.",
    });

    await useCmoStore.getState().confirmAction("a1");
    expect(useCmoStore.getState().actions.a1).toMatchObject({
      phase: "forbidden",
      text: "Tu rol no puede editar productos.",
      busy: null,
    });

    // Para el servidor sigue pendiente: releer no debe devolverle el botón.
    api.listActions.mockResolvedValueOnce([dto()]);
    await useCmoStore.getState().loadActions("t1");
    expect(useCmoStore.getState().actions.a1?.phase).toBe("forbidden");

    // Y todavía se puede descartar.
    api.rejectAction.mockResolvedValueOnce({ action_id: "a1", outcome: "rejected", text: null });
    await useCmoStore.getState().rejectAction("a1");
    expect(useCmoStore.getState().actions.a1?.phase).toBe("rejected");
  });

  it("si la llamada no llega, la acción sigue pendiente con el motivo", async () => {
    useCmoStore.setState({ actions: { a1: uiAction() } });
    api.confirmAction.mockRejectedValueOnce(
      new HttpError({ status: 503, code: "internal/unavailable", message: "Servicio no disponible" }),
    );
    await useCmoStore.getState().confirmAction("a1");
    const action = useCmoStore.getState().actions.a1;
    expect(action?.phase).toBe("pending");
    expect(action?.busy).toBeNull();
    expect(action?.error).not.toBeNull();
  });

  it("not_pending: otra persona la decidió primero, se relee y se pinta su estado real", async () => {
    useCmoStore.setState({ actions: { a1: uiAction() } });
    api.confirmAction.mockResolvedValueOnce({ action_id: "a1", outcome: "not_pending", text: "Ya estaba executed." });
    api.listActions.mockResolvedValueOnce([dto({ status: "executed", outcome_text: "Hecho por Ana." })]);
    await useCmoStore.getState().confirmAction("a1");
    expect(useCmoStore.getState().actions.a1).toMatchObject({ phase: "executed", text: "Hecho por Ana." });
  });

  it("confirmar todo: solo las R1 pendientes, todas en vuelo desde el principio y en orden", async () => {
    useCmoStore.setState({
      actions: {
        a1: uiAction({ id: "a1" }),
        a2: uiAction({ id: "a2" }),
        a3: uiAction({ id: "a3", risk: "external" }),
      },
    });
    const first = deferred<unknown>();
    api.confirmAction
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce({ action_id: "a2", outcome: "executed", text: "Dos." });

    const running = useCmoStore.getState().confirmAll(["a1", "a2", "a3"]);
    const midway = useCmoStore.getState().actions;
    expect(midway.a1?.busy).toBe("confirm");
    expect(midway.a2?.busy).toBe("confirm");
    expect(midway.a3?.busy).toBeNull();
    expect(api.confirmAction).toHaveBeenCalledTimes(1);

    first.resolve({ action_id: "a1", outcome: "executed", text: "Uno." });
    await running;
    expect(api.confirmAction.mock.calls.map((call: unknown[]) => call[0])).toEqual(["a1", "a2"]);
    const done = useCmoStore.getState().actions;
    expect(done.a1?.phase).toBe("executed");
    expect(done.a2?.phase).toBe("executed");
    expect(done.a3?.phase).toBe("pending");
  });

  it("al abrir un hilo, las acciones vuelven al mensaje de Axel de su turno", async () => {
    const transcript: CmoMessageDTO[] = [
      { ...message("m1", "owner", "2026-11-18T12:00:00.000Z"), tool_calls: null } as CmoMessageDTO,
      { ...message("m2", "axel", "2026-11-18T12:00:30.000Z"), tool_calls: null } as CmoMessageDTO,
      { ...message("m3", "owner", "2026-11-18T12:05:00.000Z"), tool_calls: null } as CmoMessageDTO,
      { ...message("m4", "axel", "2026-11-18T12:05:40.000Z"), tool_calls: null } as CmoMessageDTO,
    ];
    api.getTranscript.mockResolvedValueOnce(transcript);
    api.listActions.mockResolvedValueOnce([
      dto({ id: "late", created_at: "2026-11-18T12:05:20.000Z", status: "executed", outcome_text: "Hecho." }),
      dto({ id: "early", created_at: "2026-11-18T12:00:10.000Z" }),
    ]);

    await useCmoStore.getState().selectThread("t2");
    await flush();

    const messages = useCmoStore.getState().thread.messages;
    expect(messages.find((item) => item.id === "m2")?.action_ids).toEqual(["early"]);
    expect(messages.find((item) => item.id === "m4")?.action_ids).toEqual(["late"]);
    expect(useCmoStore.getState().actions.late?.phase).toBe("executed");
  });

  it("cambiar de hilo poda las acciones del anterior", async () => {
    useCmoStore.setState({ actions: { a1: uiAction() } });
    api.getTranscript.mockResolvedValueOnce([]);
    await useCmoStore.getState().selectThread("t2");
    expect(useCmoStore.getState().actions).toEqual({});
  });
});

describe("anchorActions", () => {
  it("no toca lo ya anclado y, sin mensaje posterior, usa el último de Axel", () => {
    const messages = [
      message("m1", "axel", "2026-11-18T12:00:00.000Z", { action_ids: ["a1"] }),
      message("m2", "axel", "2026-11-18T12:01:00.000Z"),
    ];
    const result = anchorActions(messages, [
      dto({ id: "a1", created_at: "2026-11-18T11:59:00.000Z" }),
      dto({ id: "a2", created_at: "2026-11-18T13:00:00.000Z" }),
    ]);
    expect(result[0]?.action_ids).toEqual(["a1"]);
    expect(result[1]?.action_ids).toEqual(["a2"]);
  });
});
