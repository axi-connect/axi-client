import {
  AXEL_BLINK,
  AXEL_EXPRESSION_NAMES,
  AXEL_EXPRESSIONS,
  AXEL_SACCADE,
  isAxelAccessory,
  nextBlinkDelayMs,
  nextSaccade,
  resolvePoseStyle,
} from "../axel-avatar";

/**
 * La cara de Axel es una tabla de números que el CSS convierte en transforms.
 * Lo que se protege aquí es que ESA tabla no produzca nada que el rig no sepa
 * pintar: una variable ausente deja un grupo sin transform (la cara se
 * desarma), un número no finito lo rompe entero, y un párpado fuera de 0..1
 * asoma por fuera del ojo.
 */
describe("resolvePoseStyle", () => {
  const REQUIRED = [
    "--axel-yaw",
    "--axel-pitch",
    "--axel-roll",
    "--axel-depth",
    "--axel-face-sx",
    "--axel-gap",
    "--axel-gx",
    "--axel-gy",
    "--axel-mouth",
    "--axel-mouth-w",
    "--axel-open",
    "--axel-dur",
    "--axel-ease",
    "--axel-l-top",
    "--axel-l-bot",
    "--axel-l-tilt",
    "--axel-l-sx",
    "--axel-l-scale",
    "--axel-r-top",
    "--axel-r-bot",
    "--axel-r-tilt",
    "--axel-r-sx",
    "--axel-r-scale",
  ];

  it.each(AXEL_EXPRESSION_NAMES)("«%s» escribe todas las variables del rig con números finitos", (name) => {
    const style = resolvePoseStyle(name, { transitionMs: 480, ease: "spring" });
    for (const key of REQUIRED) expect(style).toHaveProperty(key);
    for (const [key, value] of Object.entries(style)) {
      if (key === "--axel-dur" || key === "--axel-ease") continue;
      expect(Number.isFinite(Number(value))).toBe(true);
    }
    expect(style["--axel-dur"]).toBe("480ms");
    expect(style["--axel-ease"]).toBe("var(--axel-ease-spring)");
  });

  it.each(AXEL_EXPRESSION_NAMES)("«%s» mantiene párpados y apertura dentro de 0..1", (name) => {
    const p = AXEL_EXPRESSIONS[name];
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
    expect(style["--axel-face-sx"]).toBe("1");
    expect(style["--axel-gap"]).toBe("12");
    expect(style["--axel-dur"]).toBe("0ms");
  });

  it("al girar comprime SOLO el ojo lejano y acerca los ojos", () => {
    const style = resolvePoseStyle("thinking", { transitionMs: 480, ease: "spring" });
    // yaw positivo: el ojo izquierdo queda lejos.
    expect(Number(style["--axel-l-sx"])).toBeLessThan(1);
    expect(style["--axel-r-sx"]).toBe("1");
    expect(Number(style["--axel-gap"])).toBeLessThan(12);
    expect(Number(style["--axel-face-sx"])).toBeLessThan(1);
  });

  it("solo «speaking» abre la boca", () => {
    for (const name of AXEL_EXPRESSION_NAMES) {
      expect(AXEL_EXPRESSIONS[name].open).toBe(name === "speaking" ? 1 : 0);
    }
  });
});

describe("vida", () => {
  it("el parpadeo cae en su intervalo y es irregular", () => {
    expect(nextBlinkDelayMs(() => 0)).toBe(AXEL_BLINK.minIntervalMs);
    expect(nextBlinkDelayMs(() => 0.999999)).toBeLessThanOrEqual(AXEL_BLINK.maxIntervalMs);
    expect(nextBlinkDelayMs(() => 0.5)).toBe(3500);
  });

  it("las sacadas quedan en su caja y su cadencia", () => {
    const low = nextSaccade(() => 0);
    const high = nextSaccade(() => 1);
    expect(low.delayMs).toBe(AXEL_SACCADE.minIntervalMs);
    expect(high.delayMs).toBe(AXEL_SACCADE.maxIntervalMs);
    expect(low.x).toBe(AXEL_SACCADE.x[0]);
    expect(high.y).toBe(AXEL_SACCADE.y[1]);
  });
});

describe("isAxelAccessory", () => {
  it("acepta solo los accesorios conocidos", () => {
    expect(isAxelAccessory("none")).toBe(true);
    expect(isAxelAccessory("headset")).toBe(true);
    expect(isAxelAccessory("glasses")).toBe(false);
    expect(isAxelAccessory(null)).toBe(false);
  });
});
