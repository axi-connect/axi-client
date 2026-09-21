import {
  ASSISTANT_AVATAR_COLORS,
  ASSISTANT_CHARACTERS,
  AVATAR_EYE_CY,
  AVATAR_LIP_Y,
  CHARACTER_GEOMETRY,
  isAssistantAvatarColor,
  isAssistantCharacter,
  mouthOpenCy,
  mouthPath,
} from "../avatar-characters";

describe("avatar-characters", () => {
  it("Lumo es, bit a bit, la cara de Axel del 2026-09-15", () => {
    // Si alguien «mejora» a Lumo al añadir un personaje, esto lo cuenta: la cara
    // aprobada del CMO no cambia por accidente.
    expect(CHARACTER_GEOMETRY.lumo).toEqual({
      body: [{ kind: "ellipse", cx: 50, cy: 50, rx: 37, ry: 34.5 }],
      eye: { rx: 4.3, ry: 5.8, cant: 0, glintDx: -1.4, glintDy: -2.6 },
      mouth: { halfW: 7, depth: 7, openRx: 3.2, openRy: 2.1 },
      headset: true,
    });
    expect(mouthPath(CHARACTER_GEOMETRY.lumo.mouth)).toBe("M43 60 Q50 67 57 60");
    expect(mouthOpenCy(CHARACTER_GEOMETRY.lumo.mouth)).toBe(62.3);
  });

  it("los landmarks del rig no se mueven: ojos en 47 y labio en 60", () => {
    expect(AVATAR_EYE_CY).toBe(47);
    expect(AVATAR_LIP_Y).toBe(60);
  });

  it.each(ASSISTANT_CHARACTERS)("«%s» tiene una geometría completa y dentro del viewBox", (name) => {
    const g = CHARACTER_GEOMETRY[name];
    expect(g.body.length).toBeGreaterThan(0);
    for (const shape of g.body) {
      if (shape.kind === "ellipse") {
        expect(shape.cx - shape.rx).toBeGreaterThanOrEqual(0);
        expect(shape.cx + shape.rx).toBeLessThanOrEqual(100);
        expect(shape.cy - shape.ry).toBeGreaterThanOrEqual(0);
        expect(shape.cy + shape.ry).toBeLessThanOrEqual(100);
      } else if (shape.kind === "circle") {
        expect(shape.cx - shape.r).toBeGreaterThanOrEqual(0);
        expect(shape.cx + shape.r).toBeLessThanOrEqual(100);
        expect(shape.cy - shape.r).toBeGreaterThanOrEqual(0);
        expect(shape.cy + shape.r).toBeLessThanOrEqual(100);
      } else {
        expect(shape.d).toMatch(/^M[\d. ]+C.*Z$/);
      }
    }
    // El ojo cabe en los párpados (rect de x 43..57) y el brillo cae dentro del ojo.
    expect(g.eye.rx).toBeLessThanOrEqual(7);
    expect(Math.abs(g.eye.glintDx)).toBeLessThan(g.eye.rx);
    expect(Math.abs(g.eye.glintDy)).toBeLessThan(g.eye.ry);
    expect(Math.abs(g.eye.cant)).toBeLessThanOrEqual(15);
    expect(g.mouth.halfW).toBeGreaterThan(0);
    expect(mouthPath(g.mouth)).toBe(
      `M${String(50 - g.mouth.halfW)} 60 Q50 ${String(60 + g.mouth.depth)} ${String(50 + g.mouth.halfW)} 60`,
    );
  });

  it("solo Lumo lleva diadema", () => {
    expect(ASSISTANT_CHARACTERS.filter((c) => CHARACTER_GEOMETRY[c].headset)).toEqual(["lumo"]);
  });

  it("la paleta son ocho códigos y los guardas los reconocen", () => {
    expect(ASSISTANT_AVATAR_COLORS).toHaveLength(8);
    expect(isAssistantAvatarColor("coral")).toBe(true);
    expect(isAssistantAvatarColor("#e65759")).toBe(false);
    expect(isAssistantCharacter("nova")).toBe(true);
    expect(isAssistantCharacter("axel")).toBe(false);
  });
});
