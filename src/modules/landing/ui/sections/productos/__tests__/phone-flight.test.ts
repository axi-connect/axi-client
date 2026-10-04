import { flightAt } from "../game/use-phone-flight";

/** El único teléfono: asoma en el hero, sube más lento que la página y aterriza en el juego. */
const geo = { slotDoc: 1100, land: 900, vh: 900, peek: 288 };
const screenTop = (s: number) => geo.slotDoc - s + flightAt(s, geo).ty;

describe("vuelo del teléfono", () => {
  it("en el hero asoma `peek` px sobre el fondo de la pantalla, en pose de hero", () => {
    const f = flightAt(0, geo);
    expect(screenTop(0)).toBeCloseTo(geo.vh - geo.peek);
    expect(f.t).toBe(0);
    expect(f.rx).toBeCloseTo(22);
    // En el hero se ve más grande (pedido de la dueña) y se ajusta al aterrizar.
    expect(f.scale).toBeCloseTo(1.14);
  });

  it("aterriza en su sitio justo cuando el juego toca el techo, sin salto", () => {
    expect(flightAt(geo.land, geo).ty).toBeCloseTo(0);
    // Sin salto: un px de scroll antes, el teléfono está a menos de un px de su sitio.
    expect(Math.abs(screenTop(geo.land - 1) - screenTop(geo.land))).toBeLessThan(1.5);
    expect(flightAt(geo.land + 300, geo).ty).toBe(0);
    expect(flightAt(geo.land, geo).ry).toBeCloseTo(-14);
  });

  it("sube siempre (nunca baja) y más despacio que la página mientras el hero se va", () => {
    let prev = Infinity;
    for (let s = 0; s <= geo.land; s += 25) {
      const y = screenTop(s);
      expect(y).toBeLessThanOrEqual(prev + 1e-6);
      // El hero sube `s`; el teléfono, menos: el titular se aleja por encima.
      expect(geo.vh - geo.peek - y).toBeLessThanOrEqual(s + 1e-6);
      prev = y;
    }
  });
});
