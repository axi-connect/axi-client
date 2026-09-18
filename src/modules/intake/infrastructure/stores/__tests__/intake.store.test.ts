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
jest.mock("@/modules/intake/infrastructure/services/intake-service.adapter", () => ({
  intakeService: {
    message: (...args: unknown[]) => message(...args),
    patchAnswers: (...args: unknown[]) => patchAnswers(...args),
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
      has_pending_required: false,
      has_pending_confirmation: false,
    },
    closing: null,
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
