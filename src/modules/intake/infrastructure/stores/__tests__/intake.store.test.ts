import { HttpError } from "@/core/api/problem";
import type { IntakeField, IntakeSessionView } from "@/modules/intake/domain/intake";

/**
 * La sesión se cerró (en otra pestaña, o el servidor la cerró) mientras esta
 * pantalla seguía abierta. El 409 `intake/session_closed` NO es un fallo de
 * red: la pantalla tiene que pasar a «terminada», no enseñar «No se pudo
 * guardar» ni dejar un mensaje optimista como si se hubiera enviado.
 */

const message = jest.fn();
const patchAnswers = jest.fn();
const finish = jest.fn();
const listened = jest.fn<Promise<void>, unknown[]>(() => Promise.resolve());
jest.mock("@/modules/intake/infrastructure/services/intake-service.adapter", () => ({
  intakeService: {
    message: (...args: unknown[]) => message(...args),
    patchAnswers: (...args: unknown[]) => patchAnswers(...args),
    finish: (...args: unknown[]) => finish(...args),
    listened: (...args: unknown[]) => listened(...args),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useIntakeStore, SESSION_CLOSED_NOTICE } = require("../intake.store") as typeof import("../intake.store");

const closed = () =>
  new HttpError({
    status: 409,
    code: "intake/session_closed",
    message: "Esta conversación ya terminó. Gracias por tu tiempo.",
  });

const FIELD: IntakeField = {
  code: "ciudad",
  label: "Ciudad",
  kind: "text",
  required: false,
  help: null,
  options: null,
  value: "Bogotá",
  display: "Bogotá",
  source: "stated",
  needs_confirmation: false,
  skipped: null,
};

function session(): IntakeSessionView {
  return {
    status: "in_progress",
    assistant_name: "Alba",
    company_name: "Savage",
    invite_name: "Isabel",
    estimated_minutes: 7,
    turns_left: 40,
    voice_enabled: false,
    messages: [],
    topics: [{ code: "negocio", title: "Tu negocio", fields: [FIELD] }],
    progress: {
      topics: [],
      percent: 0,
      next_topic: null,
      next_field: null,
      has_pending_required: false,
      has_pending_confirmation: false,
      essential: { confirmed: 0, total: 1, complete: false },
      pending_review: 0,
      next_ask: null,
    },
    closing: null,
    summary: null,
    resume: null,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  useIntakeStore.setState({
    token: "t".repeat(32),
    session: session(),
    messages: [],
    loading: false,
    thinking: false,
    blocked: null,
    turnError: null,
    savingField: null,
  });
});

describe("intake.store — la sesión se cerró debajo de la pantalla", () => {
  it("guardar desde la ficha devuelve false y la pantalla pasa a terminada", async () => {
    patchAnswers.mockRejectedValueOnce(closed());
    const ok = await useIntakeStore.getState().saveField(FIELD, "Medellín");
    expect(ok).toBe(false);
    expect(useIntakeStore.getState().session?.status).toBe("completed");
    expect(useIntakeStore.getState().savingField).toBeNull();
  });

  it("aplazar un tema no lanza y también cierra la pantalla", async () => {
    patchAnswers.mockRejectedValueOnce(closed());
    await expect(useIntakeStore.getState().deferTopic("negocio")).resolves.toBeUndefined();
    expect(useIntakeStore.getState().session?.status).toBe("completed");
  });

  it("enviar retira el mensaje optimista y deja el aviso propio, no el de red", async () => {
    message.mockRejectedValueOnce(closed());
    await useIntakeStore.getState().send("Abrimos a las 9");
    const state = useIntakeStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.thinking).toBe(false);
    expect(state.turnError).toBe(SESSION_CLOSED_NOTICE);
    expect(state.session?.status).toBe("completed");
  });

  it("otro error de la ficha sigue devolviendo false sin tocar el estado de la sesión", async () => {
    patchAnswers.mockRejectedValueOnce(new Error("red"));
    const ok = await useIntakeStore.getState().saveField(FIELD, "Medellín");
    expect(ok).toBe(false);
    expect(useIntakeStore.getState().session?.status).toBe("in_progress");
  });
});

describe("intake.store — el turno que termina trae el resumen del cierre", () => {
  it("guarda summary junto con closing y el estado completed", async () => {
    const summary = {
      axi_applies: 3,
      applied: false,
      you_do: [],
      to_activate: [{ step: "whatsapp" as const, label: "Conectar tu WhatsApp", where: "Canales" }],
    };
    message.mockResolvedValueOnce({
      reply: "¡Listo!",
      question: null,
      captured: [],
      progress: session().progress,
      finished: true,
      closing: "Listo, Isabel.",
      summary,
      turns_left: 39,
      captured_values: [],
      skipped_now: [],
      removed: [],
      reopened: [],
    });
    await useIntakeStore.getState().send("Eso es todo");
    const state = useIntakeStore.getState().session;
    expect(state?.status).toBe("completed");
    expect(state?.closing).toBe("Listo, Isabel.");
    expect(state?.summary).toEqual(summary);
  });
});

describe("intake.store — revisar lo encontrado sin gastar turnos (island-live F3)", () => {
  const derived: IntakeField = { ...FIELD, source: "derived", needs_confirmation: true };
  const withDerived = (): IntakeSessionView => ({
    ...session(),
    topics: [{ code: "negocio", title: "Tu negocio", fields: [derived] }],
  });

  it("«Así es» manda `confirm` (no el valor) y deja el dato confirmado, sin turno", async () => {
    useIntakeStore.setState({ session: withDerived() });
    patchAnswers.mockResolvedValueOnce({ progress: session().progress, applied: ["ciudad"], rejected: [], skipped: [], unskipped: [] });
    await expect(useIntakeStore.getState().confirmField(derived)).resolves.toBe(true);
    expect(patchAnswers).toHaveBeenCalledWith("t".repeat(32), { confirm: ["ciudad"] });
    expect(message).not.toHaveBeenCalled();
    const field = useIntakeStore.getState().session?.topics[0]?.fields[0];
    expect(field).toMatchObject({ source: "stated", needs_confirmation: false, value: "Bogotá" });
    expect(useIntakeStore.getState().reviewResolved).toEqual([
      { code: "ciudad", label: "Ciudad", display: "Bogotá", outcome: "confirmed" },
    ]);
  });

  it("«Después» no escribe nada: aparta la tarjeta y lo recuerda en esta pestaña", () => {
    useIntakeStore.setState({ session: withDerived() });
    useIntakeStore.getState().laterField(derived);
    expect(patchAnswers).not.toHaveBeenCalled();
    expect(useIntakeStore.getState().reviewLater).toEqual(["ciudad"]);
    expect(JSON.parse(window.sessionStorage.getItem(`intake.later.${"t".repeat(32)}`) ?? "{}")).toEqual({
      later: ["ciudad"],
      deferred: false,
    });
  });

  it("«Enviar a revisión» cierra sin modelo y la pantalla pasa a terminada con la vista del servidor", async () => {
    finish.mockResolvedValueOnce({ ...session(), status: "completed", closing: "Listo" });
    useIntakeStore.setState({ finalReviewOpen: true });
    await useIntakeStore.getState().finish();
    expect(message).not.toHaveBeenCalled();
    expect(useIntakeStore.getState().session?.status).toBe("completed");
    expect(useIntakeStore.getState().finalReviewOpen).toBe(false);
  });

  it("si enviar falla, lo dice junto al botón y deja reintentar", async () => {
    finish.mockRejectedValueOnce(new HttpError({ status: 500, code: "x", message: "Algo falló" }));
    await useIntakeStore.getState().finish();
    expect(useIntakeStore.getState().finishError).toBe("Algo falló");
    expect(useIntakeStore.getState().finishing).toBe(false);
  });

  it("escuchar se cuenta y nunca falla hacia arriba", () => {
    listened.mockRejectedValueOnce(new Error("red"));
    expect(() => {
      useIntakeStore.getState().listened();
    }).not.toThrow();
    expect(listened).toHaveBeenCalledWith("t".repeat(32));
  });
});
