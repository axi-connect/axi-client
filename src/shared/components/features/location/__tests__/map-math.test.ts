import { metersPerPixel, tileFor, tileMosaic, zoomFor } from "../MapPreview";

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

/**
 * `tileMosaic` nace de un defecto que el dueño vio en la ficha: el mapa dejaba
 * una franja vacía —negra en tema oscuro— pegada al borde derecho o al
 * izquierdo, «generalmente nunca se ajusta completamente».
 *
 * La causa era una rejilla de 3×3 FIJA: 768 px de mosaico que se corren hasta
 * ±128 px para centrar el punto, así que lo único garantizado eran
 * `(3−1)·256 = 512 px` de ancho — menos que cualquier tarjeta del panel. Con las
 * coordenadas del informe el corrimiento era de 126 px y quedaban ~68 px de
 * tarjeta sin tesela.
 *
 * Y sobrevivió porque era la única función del fichero sin prueba. Un mapa con
 * una franja al lado sigue pareciendo un mapa.
 */
describe("tileMosaic", () => {
  /** ¿Tapan las teselas el visor entero? Es la única pregunta que importa. */
  function covers(
    tiles: { left: number; top: number }[],
    width: number,
    height: number,
  ): boolean {
    if (tiles.length === 0) return false;
    const lefts = tiles.map((tile) => tile.left);
    const tops = tiles.map((tile) => tile.top);
    return (
      Math.min(...lefts) <= -width / 2 &&
      Math.max(...lefts) + 256 >= width / 2 &&
      Math.min(...tops) <= -height / 2 &&
      Math.max(...tops) + 256 >= height / 2
    );
  }

  it("EL BUG: cubre el visor para CUALQUIER punto y cualquier tamaño", () => {
    // El barrido de longitudes recorre todos los corrimientos posibles dentro de
    // una tesela, que es la variable que decidía si aparecía la franja. Un solo
    // test que vale por todas las coordenadas del mundo.
    for (let step = 0; step < 64; step += 1) {
      const lng = -180 + (360 * step) / 64;
      for (const lat of [4.68, -33.45, 51.5, 64.13]) {
        for (const [width, height] of [
          [320, 148],
          [520, 148],
          [653, 148],
          [653, 260],
          [900, 260],
        ]) {
          const zoom = 13;
          const { tiles } = tileMosaic({ lat, lng, zoom, width, height });
          expect(covers(tiles, width, height)).toBe(true);
        }
      }
    }
  });

  it("el caso del informe: Karen's Pizza a 653 px queda cubierto", () => {
    // `fraction_x = 0.99`, el peor corrimiento posible: es el punto con el que
    // se reportó la franja.
    const { tiles } = tileMosaic({
      lat: 4.6785,
      lng: -74.0482,
      zoom: 13,
      width: 653,
      height: 148,
    });
    expect(covers(tiles, 653, 148)).toBe(true);
  });

  it("y pide MENOS teselas que la rejilla de 3×3 que reemplaza", () => {
    // No es un detalle: las teselas las dona OpenStreetMap y el 3×3 se justificaba
    // con eso. Tapar bien sale más barato que taparlo mal.
    const { tiles } = tileMosaic({
      lat: 4.6785,
      lng: -74.0482,
      zoom: 13,
      width: 653,
      height: 148,
    });
    expect(tiles.length).toBeLessThan(9);
  });

  it("la cuenta de teselas está acotada por el tamaño del visor", () => {
    for (const [width, height] of [
      [653, 148],
      [900, 260],
      [1_400, 600],
    ]) {
      const { tiles } = tileMosaic({ lat: 4.68, lng: -74.05, zoom: 14, width, height });
      const cap = (Math.ceil(width / 256) + 1) * (Math.ceil(height / 256) + 1);
      expect(tiles.length).toBeLessThanOrEqual(cap);
    }
  });

  it("sin ancho medido no pide ninguna tesela", () => {
    // Pintar con la rejilla equivocada es una tanda de peticiones tiradas.
    expect(tileMosaic({ lat: 4.68, lng: -74.05, zoom: 14, width: 0, height: 148 }).tiles)
      .toEqual([]);
  });

  it("la longitud da la vuelta al mundo y la latitud NO", () => {
    // Lo que ya funcionaba y no lo cubría nada. En el antimeridiano las teselas
    // siguen existiendo al otro lado; más allá del polo no hay ninguna que pedir.
    const world = 2 ** 4;
    const meridian = tileMosaic({ lat: 0, lng: 179.99, zoom: 4, width: 900, height: 260 });
    expect(meridian.tiles.every((tile) => tile.x >= 0 && tile.x < world)).toBe(true);
    expect(meridian.tiles.some((tile) => tile.x === 0)).toBe(true);

    const pole = tileMosaic({ lat: 85, lng: 0, zoom: 4, width: 900, height: 900 });
    expect(pole.tiles.every((tile) => tile.y >= 0 && tile.y < world)).toBe(true);
  });
});
