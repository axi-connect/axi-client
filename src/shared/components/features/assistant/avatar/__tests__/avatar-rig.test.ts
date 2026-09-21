import {
  AVATAR_BLINK,
  ASSISTANT_EXPRESSION_NAMES,
  ASSISTANT_EXPRESSIONS,
  AVATAR_SACCADE,
  isAssistantAccessory,
  nextBlinkDelayMs,
  nextSaccade,
  resolvePoseStyle,
} from "../avatar-rig";

/**
 * La cara de Axel es una tabla de números que el CSS convierte en transforms.
 * Lo que se protege aquí es que ESA tabla no produzca nada que el rig no sepa
 * pintar: una variable ausente deja un grupo sin transform (la cara se
 * desarma), un número no finito lo rompe entero, y un párpado fuera de 0..1
 * asoma por fuera del ojo.
 */
describe("resolvePoseStyle", () => {
  const REQUIRED = [
    "--av-yaw",
    "--av-pitch",
    "--av-roll",
    "--av-depth",
    "--av-face-sx",
    "--av-gap",
    "--av-gx",
    "--av-gy",
    "--av-mouth",
    "--av-mouth-w",
    "--av-open",
    "--av-dur",
    "--av-ease",
    "--av-l-top",
    "--av-l-bot",
    "--av-l-tilt",
    "--av-l-sx",
    "--av-l-scale",
    "--av-r-top",
    "--av-r-bot",
    "--av-r-tilt",
    "--av-r-sx",
    "--av-r-scale",
  ];

  it.each(ASSISTANT_EXPRESSION_NAMES)("«%s» escribe todas las variables del rig con números finitos", (name) => {
    const style = resolvePoseStyle(name, { transitionMs: 480, ease: "spring" });
    for (const key of REQUIRED) expect(style).toHaveProperty(key);
    for (const [key, value] of Object.entries(style)) {
      if (key === "--av-dur" || key === "--av-ease") continue;
      expect(Number.isFinite(Number(value))).toBe(true);
    }
    expect(style["--av-dur"]).toBe("480ms");
    expect(style["--av-ease"]).toBe("var(--av-ease-spring)");
  });

  it.each(ASSISTANT_EXPRESSION_NAMES)("«%s» mantiene párpados y apertura dentro de 0..1", (name) => {
    const p = ASSISTANT_EXPRESSIONS[name];
    for (const eye of [p.l, p.r]) {
      expect(eye.top).toBeGreaterThanOrEqual(0);
      expect(eye.top).toBeLessThanOrEqual(1);
      expect(eye.bot).toBeGreaterThanOrEqual(0);
      expect(eye.bot).toBeLessThanOrEqual(1);
      // Párpados que se cruzan = una franja de piel en medio del ojo.
      expect(eye.top + eye.bot).toBeLessThanOrEqual(1);
    }
    expect(p.open).toBeGreaterThanOrEqual(0);
    expect(p.open).toBeLessThanOrEqual(1);
    // Giros dentro del rango que el parallax sabe vender.
    expect(Math.abs(p.yaw)).toBeLessThanOrEqual(22);
    expect(Math.abs(p.pitch)).toBeLessThanOrEqual(12);
    expect(Math.abs(p.roll)).toBeLessThanOrEqual(10);
  });

  it("de frente no comprime la cara ni acerca los ojos", () => {
    const style = resolvePoseStyle("neutral", { transitionMs: 0, ease: "smooth" });
    expect(style["--av-face-sx"]).toBe("1");
    expect(style["--av-gap"]).toBe("12");
    expect(style["--av-dur"]).toBe("0ms");
  });

  it("al girar comprime SOLO el ojo lejano y acerca los ojos", () => {
    const style = resolvePoseStyle("thinking", { transitionMs: 480, ease: "spring" });
    // yaw positivo: el ojo izquierdo queda lejos.
    expect(Number(style["--av-l-sx"])).toBeLessThan(1);
    expect(style["--av-r-sx"]).toBe("1");
    expect(Number(style["--av-gap"])).toBeLessThan(12);
    expect(Number(style["--av-face-sx"])).toBeLessThan(1);
  });

  it("solo «speaking» abre la boca", () => {
    for (const name of ASSISTANT_EXPRESSION_NAMES) {
      expect(ASSISTANT_EXPRESSIONS[name].open).toBe(name === "speaking" ? 1 : 0);
    }
  });
});

describe("vida", () => {
  it("el parpadeo cae en su intervalo y es irregular", () => {
    expect(nextBlinkDelayMs(() => 0)).toBe(AVATAR_BLINK.minIntervalMs);
    expect(nextBlinkDelayMs(() => 0.999999)).toBeLessThanOrEqual(AVATAR_BLINK.maxIntervalMs);
    expect(nextBlinkDelayMs(() => 0.5)).toBe(3500);
  });

  it("las sacadas quedan en su caja y su cadencia", () => {
    const low = nextSaccade(() => 0);
    const high = nextSaccade(() => 1);
    expect(low.delayMs).toBe(AVATAR_SACCADE.minIntervalMs);
    expect(high.delayMs).toBe(AVATAR_SACCADE.maxIntervalMs);
    expect(low.x).toBe(AVATAR_SACCADE.x[0]);
    expect(high.y).toBe(AVATAR_SACCADE.y[1]);
  });
});

describe("isAssistantAccessory", () => {
  it("acepta solo los accesorios conocidos", () => {
    expect(isAssistantAccessory("none")).toBe(true);
    expect(isAssistantAccessory("headset")).toBe(true);
    expect(isAssistantAccessory("glasses")).toBe(false);
    expect(isAssistantAccessory(null)).toBe(false);
  });
});
