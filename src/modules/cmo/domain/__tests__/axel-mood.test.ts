import {
  canGreet,
  gazeAllowed,
  gestureForTap,
  isLiveMood,
  MOOD_EXPRESSION,
  resolveAxelMood,
  type AxelMood,
  type AxelMoodInput,
} from "../axel-mood";

/**
 * El humor es una prioridad, no una suma: cuando dos señales son verdad a la
 * vez, la cara tiene que elegir una. Esta tabla fija QUIÉN gana a quién, que es
 * lo único que el dueño ve cuando algo «no cuadra» en la cara.
 */
const base: AxelMoodInput = {
  blocker: null,
  thinking: false,
  streaming: false,
  lastMessage: null,
  ownerTyping: false,
  celebrating: false,
};

const axel = (over: Partial<NonNullable<AxelMoodInput["lastMessage"]>> = {}) => ({
  role: "axel" as const,
  failed: false,
  hasProposal: false,
  hasQuestion: false,
  ...over,
});
const owner = (over: Partial<NonNullable<AxelMoodInput["lastMessage"]>> = {}) => ({
  ...axel(over),
  role: "owner" as const,
});

describe("resolveAxelMood", () => {
  it.each<[string, Partial<AxelMoodInput>, AxelMood]>([
    ["sin nada, reposo", {}, "idle"],
    ["bloqueado por cuota", { blocker: "quota" }, "asleep"],
    ["apagado", { blocker: "disabled" }, "asleep"],
    ["el bloqueo gana a pensar", { blocker: "quota", thinking: true }, "asleep"],
    ["el último mensaje del dueño falló", { lastMessage: owner({ failed: true }) }, "sorry"],
    ["la disculpa gana a pensar", { lastMessage: owner({ failed: true }), thinking: true }, "sorry"],
    ["pensando sin texto", { thinking: true }, "thinking"],
    ["pensando con texto = hablando", { thinking: true, streaming: true }, "speaking"],
    ["hablar gana a celebrar", { thinking: true, streaming: true, celebrating: true }, "speaking"],
    ["teclear", { ownerTyping: true }, "listening"],
    ["teclear gana a la pregunta abierta", { ownerTyping: true, lastMessage: axel({ hasQuestion: true }) }, "listening"],
    ["teclear gana a celebrar", { ownerTyping: true, celebrating: true }, "listening"],
    ["celebrando una propuesta", { celebrating: true, lastMessage: axel({ hasProposal: true }) }, "proud"],
    ["propuesta ya sin celebrar = reposo", { lastMessage: axel({ hasProposal: true }) }, "idle"],
    ["pregunta abierta", { lastMessage: axel({ hasQuestion: true }) }, "curious"],
    ["propuesta y pregunta, sin celebrar: la pregunta sigue viva", { lastMessage: axel({ hasProposal: true, hasQuestion: true }) }, "curious"],
    ["un aviso del sistema al final no cambia la cara", { lastMessage: { role: "system", failed: false, hasProposal: false, hasQuestion: false } }, "idle"],
    ["un mensaje del dueño sin fallo no cambia la cara", { lastMessage: owner() }, "idle"],
  ])("%s", (_, over, expected) => {
    expect(resolveAxelMood({ ...base, ...over })).toBe(expected);
  });
});

describe("mapas y guardas", () => {
  const ALL: AxelMood[] = ["idle", "listening", "thinking", "speaking", "proud", "curious", "sorry", "asleep"];

  it("cada humor tiene expresión", () => {
    for (const mood of ALL) expect(MOOD_EXPRESSION[mood]).toBeTruthy();
  });

  it("solo pensar y hablar son trabajo vivo del servidor", () => {
    expect(ALL.filter(isLiveMood)).toEqual(["thinking", "speaking"]);
  });

  it("la mirada sigue al puntero solo cuando la expresión no manda sobre los ojos", () => {
    expect(ALL.filter(gazeAllowed)).toEqual(["idle", "listening", "proud", "curious"]);
  });

  it("Axel no saluda ocupado, dormido ni disculpándose", () => {
    expect(ALL.filter((m) => !canGreet(m))).toEqual(["thinking", "speaking", "sorry", "asleep"]);
  });

  it("el tercer toque seguido es el saludo", () => {
    expect(gestureForTap(1)).toBe("wink");
    expect(gestureForTap(2)).toBe("wink");
    expect(gestureForTap(3)).toBe("wave");
  });
});
