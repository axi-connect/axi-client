/**
 * La luz del hero que abraza el marco (plan §25). Valores reales de 1440 × 900:
 * el nudo a 612 px (68 % del alto), la escena de 900. Cada tramo con los dos
 * signos: lo que debe pasar y lo que no.
 */
import { FRAME, LIGHT, lightState, openOf } from "@/modules/landing/domain/film/video-light";

const at = (a: number, p = 0) => lightState({ a, p, vh: 900, sh: 900, knotY: 612 });
const frameTop = 900 * (0.5 + FRAME.ty - FRAME.scale / 2);

describe("la luz del hero y el marco del video", () => {
  it("en reposo manda el nudo: la gota no se ve y está justo donde él", () => {
    const s = at(0);
    expect(s.drop).toBe(0);
    expect(s.top + s.dropY).toBeCloseTo(612);
    expect(s.ring).toBe(0);
    expect(s.flash.alpha).toBe(0);
  });

  it("al primer píxel de scroll la gota releva al nudo en su sitio: sin salto ni hueco", () => {
    const s = at(0.001);
    expect(s.drop).toBe(1);
    expect(Math.abs(s.top + s.dropY - 612)).toBeLessThan(1);
  });

  it("cae un 14 % del alto en pantalla mientras la escena sube, y no toca el marco antes de tiempo", () => {
    const s = at(LIGHT.fallUntil - 0.02);
    expect(s.top + s.dropY).toBeGreaterThan(612 + 0.13 * 900 - 4);
    expect(s.u).toBeLessThan(0);
    expect(s.arcs.drawn).toBe(0);
  });

  it("en el contacto se aplasta sobre el filo, destella y los arcos van a medias", () => {
    // u = 0,3: a medio contacto.
    const a = 1 - (612 + 0.14 * 900 - frameTop - 0.3 * LIGHT.contact * 900) / 900;
    const s = at(a);
    expect(s.u).toBeCloseTo(0.3, 2);
    expect(s.dropY).toBeCloseTo(frameTop); // sobre el filo superior
    expect(s.squash.x).toBeGreaterThan(1.5);
    expect(s.squash.y).toBeLessThan(0.7);
    expect(s.flash.alpha).toBeGreaterThan(0.8);
    expect(s.arcs.drawn).toBeGreaterThan(0.4);
    expect(s.arcs.drawn).toBeLessThan(1);
    expect(s.breath).toBe(0); // nunca respira durante el contacto
  });

  it("fijada, el anillo está cerrado y encendido, respira, y no queda gota, destello ni arcos", () => {
    const s = at(1, 0.05);
    expect(s.ring).toBeCloseTo(1);
    expect(s.breath).toBe(1);
    expect(s.drop).toBe(0);
    expect(s.flash.alpha).toBeCloseTo(0);
    expect(s.arcs.alpha).toBe(0);
  });

  it("se apaga con la apertura y está a 0 antes de que el borde llegue a los lados", () => {
    const half = at(1, 0.3);
    expect(half.open).toBeGreaterThan(0.2);
    expect(half.ring).toBeLessThan(1);
    expect(half.ring).toBeGreaterThan(0);
    // Primer progreso con el anillo en 0: el marco aún no ocupa todo el ancho.
    let p = 0.12;
    while (at(1, p).ring > 0) p += 0.005;
    const s = FRAME.scale + (1 - FRAME.scale) * openOf(p);
    expect(s).toBeLessThan(0.95);
    expect(at(1, 1).ring).toBe(0);
    expect(at(1, 0.72).ring).toBe(0);
  });

  it("la intensidad baja de forma monótona al abrir (nunca vuelve a subir)", () => {
    let prev = Infinity;
    for (let p = 0.12; p <= 1; p += 0.02) {
      const r = at(1, p).ring;
      expect(r).toBeLessThanOrEqual(prev + 1e-9);
      prev = r;
    }
  });
});
