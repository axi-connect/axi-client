import { metersPerPixel, tileFor, zoomFor } from "../MapPreview";

/**
 * La aritmética del mapa se prueba sola porque es donde este componente puede
 * equivocarse EN SILENCIO: un mapa mal centrado sigue pareciendo un mapa, y
 * quien elige el radio encima de él no tiene forma de notar que está mirando
 * otra manzana.
 */
describe("tileFor", () => {
  it("ubica el origen en el centro del mundo", () => {
    // Con zoom 1 el planeta son 2×2 teselas: el punto (0,0) cae justo en la
    // esquina donde se tocan las cuatro.
    const tile = tileFor(0, 0, 1);
    expect(tile.x).toBe(1);
    expect(tile.fraction_x).toBeCloseTo(0, 5);
  });

  it("ubica Bogotá donde le toca", () => {
    // Comprobado contra la fórmula clásica de la especificación de teselas
    // (`log(tan + sec)`), que es una implementación independiente de la que usa
    // el componente (`asinh(tan)`): las dos dan la misma tesela.
    const tile = tileFor(4.6486, -74.0628, 12);
    expect(tile.x).toBe(1205);
    expect(tile.y).toBe(1995);
  });

  it("la fracción dentro de la tesela está siempre en [0,1)", () => {
    for (const [lat, lng] of [
      [4.6486, -74.0628],
      [-33.45, -70.66],
      [51.5, -0.12],
      [35.68, 139.69],
    ]) {
      const tile = tileFor(lat, lng, 14);
      expect(tile.fraction_x).toBeGreaterThanOrEqual(0);
      expect(tile.fraction_x).toBeLessThan(1);
      expect(tile.fraction_y).toBeGreaterThanOrEqual(0);
      expect(tile.fraction_y).toBeLessThan(1);
    }
  });
});

describe("metersPerPixel", () => {
  it("en el ecuador y zoom 0, una tesela cubre el planeta", () => {
    // 156.543 m/px × 256 px ≈ 40.075 km, la circunferencia terrestre.
    expect(metersPerPixel(0, 0) * 256).toBeCloseTo(40_075_016, -3);
  });

  it("cada nivel de zoom parte la escala por dos", () => {
    expect(metersPerPixel(4.65, 13)).toBeCloseTo(metersPerPixel(4.65, 14) * 2, 6);
  });

  it("corrige por latitud: un píxel en Bogotá cubre más que en Londres", () => {
    // Sin la corrección del coseno, el círculo del radio saldría con el tamaño
    // equivocado en cuanto uno se aleja del ecuador.
    expect(metersPerPixel(4.65, 14)).toBeGreaterThan(metersPerPixel(51.5, 14));
  });
});

describe("zoomFor", () => {
  it("a más radio, menos zoom: el círculo tiene que caber entero", () => {
    const zooms = [1_000, 3_000, 10_000, 30_000].map((radius) => zoomFor(radius, true));
    expect(zooms).toEqual([...zooms].sort((a, b) => b - a));
  });

  it("plegado se aleja un nivel respecto a expandido", () => {
    expect(zoomFor(3_000, false)).toBe(zoomFor(3_000, true) - 1);
  });

  it("sin radio elige un encuadre de barrio en vez de fallar", () => {
    expect(zoomFor(null, true)).toBeGreaterThan(10);
  });
});
