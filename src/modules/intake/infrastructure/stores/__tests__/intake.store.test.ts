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
const { useIntakeStore, SESSION_CLOSED_NOTICE, turnErrorCopy } = require("../intake.store") as typeof import("../intake.store");

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
  window.localStorage.clear();
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

  it("«Después» no escribe nada: aparta la tarjeta y lo recuerda en este navegador, con el total", () => {
    useIntakeStore.setState({ session: withDerived(), reviewTotal: 11 });
    useIntakeStore.getState().laterField(derived);
    expect(patchAnswers).not.toHaveBeenCalled();
    expect(useIntakeStore.getState().reviewLater).toEqual(["ciudad"]);
    // localStorage y no sessionStorage: volver mañana por el enlace no repite lo apartado (C2).
    expect(JSON.parse(window.localStorage.getItem(`intake.later.${"t".repeat(32)}`) ?? "{}")).toEqual({
      later: ["ciudad"],
      total: 11,
    });
  });

  it("escribir aparta la revisión: la isla sigue a la conversación, no a una tarjeta dejada atrás (C1)", async () => {
    const pending = { ...session().progress, pending_review: 2 };
    useIntakeStore.setState({ session: { ...withDerived(), progress: pending }, reviewDeferred: false });
    message.mockResolvedValueOnce({
      reply: "ok",
      question: null,
      captured: [],
      progress: pending,
      finished: false,
      closing: null,
      summary: null,
      turns_left: 39,
      captured_values: [],
      skipped_now: [],
      removed: [],
      reopened: [],
    });
    await useIntakeStore.getState().send("hola");
    expect(useIntakeStore.getState().reviewDeferred).toBe(true);
  });

  it("«Enviar a revisión» cierra sin modelo y la pantalla pasa a terminada con la vista del servidor", async () => {
    finish.mockResolvedValueOnce({ ...session(), status: "completed", closing: "Listo" });
    useIntakeStore.setState({ finalReviewOpen: true });
    window.localStorage.setItem(`intake.later.${"t".repeat(32)}`, JSON.stringify({ later: ["a"], total: 3 }));
    await useIntakeStore.getState().finish();
    expect(message).not.toHaveBeenCalled();
    expect(useIntakeStore.getState().session?.status).toBe("completed");
    // Cerrada, lo apartado ya no sirve: no queda una entrada por enlace para siempre.
    expect(window.localStorage.getItem(`intake.later.${"t".repeat(32)}`)).toBeNull();
    expect(useIntakeStore.getState().finalReviewOpen).toBe(false);
  });

  it("si otra pestaña ya la cerró, la pantalla pasa a terminada y lo apartado se borra igual", async () => {
    finish.mockRejectedValueOnce(closed());
    window.localStorage.setItem(`intake.later.${"t".repeat(32)}`, JSON.stringify({ later: ["a"], total: 3 }));
    await useIntakeStore.getState().finish();
    expect(useIntakeStore.getState().session?.status).toBe("completed");
    expect(window.localStorage.getItem(`intake.later.${"t".repeat(32)}`)).toBeNull();
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

describe("intake.store — lo que se lee cuando un turno no sale (hotfix de límites)", () => {
  const http = (status: number, code: string, text = "detalle técnico") =>
    new HttpError({ status, code, message: text });

  it("los códigos de la entrevista conservan su texto, escrito para la persona", () => {
    expect(turnErrorCopy(http(409, "intake/turn_in_progress", "Todavía estoy respondiendo."))).toBe(
      "Todavía estoy respondiendo.",
    );
  });

  it("una validación, un 502 o un 500 no pintan jerga en la burbuja", () => {
    const validation = turnErrorCopy(http(400, "validation/failed", "message: Too big"));
    expect(validation).not.toContain("Too big");
    expect(validation).toContain("1.500 caracteres");
    expect(turnErrorCopy(http(502, "ai/provider_error", "Error del proveedor IA"))).not.toContain(
      "proveedor",
    );
    expect(turnErrorCopy(http(500, "internal/unexpected", "Error interno"))).toContain("sigue guardado");
  });

  it("el freno de peticiones y el tiempo agotado dicen qué hacer", () => {
    expect(turnErrorCopy(http(429, "http/too_many_requests"))).toContain("Espera unos segundos");
    expect(turnErrorCopy(new DOMException("timed out", "TimeoutError"))).toContain("Recarga la página");
    expect(turnErrorCopy(new TypeError("Failed to fetch"))).toContain("Revisa tu conexión");
  });

  it("enviar va con presupuesto de espera y el fallo deja el texto propio", async () => {
    message.mockRejectedValueOnce(http(502, "ai/provider_error", "Error del proveedor IA"));
    await useIntakeStore.getState().send("Abrimos a las 9");
    expect(message.mock.calls[0]?.[3]).toBeInstanceOf(AbortSignal);
    expect(useIntakeStore.getState().turnError).toContain("Vuelve a enviarlo");
  });
});
