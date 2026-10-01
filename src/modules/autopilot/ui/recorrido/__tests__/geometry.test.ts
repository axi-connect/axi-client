import { DEST_POINT, EXIT_W, exitCenters, flowWidth, MAP_W, pointAt, SOURCE_POINT, splitAt, stopPoints } from "../geometry";

/** La geometría de la ruta: el grosor, el corte en Axi y los desvíos que no se pisan. */
describe("geometry", () => {
  const points = stopPoints(7);

  it("el grosor es 2 + 4·√(n/max): 2 px sin nadie, 6 px con todas; sin dato, nada", () => {
    expect(flowWidth(0, 25)).toBe(2);
    expect(flowWidth(25, 25)).toBe(6);
    expect(flowWidth(null, 25)).toBe(0);
  });

  it("partir al 80 % del tercer tramo: dos tramos sólidos enteros, el tercero partido y el resto punteado", () => {
    const { solid, todo } = splitAt(points, 2.8);
    expect(solid.slice(0, 2).every((part) => part !== null)).toBe(true);
    expect(todo.slice(0, 2).every((part) => part === null)).toBe(true);
    expect(solid[2]).not.toBeNull();
    expect(todo[2]).not.toBeNull();
    // Un solo trazo: lo de delante empieza donde acaba lo de atrás.
    expect(todo[2]?.[0]).toEqual(solid[2]?.[3]);
    expect(solid.slice(3).every((part) => part === null)).toBe(true);
  });

  it("Axi al 80 % del tramo cae antes de su parada, nunca encima del nodo", () => {
    const axi = pointAt(points, 2.8);
    expect(axi.x).toBeGreaterThan(points[1]?.x ?? 0);
    expect(axi.x).toBeLessThan(points[2]?.x ?? 0);
  });

  it("en cola está en la fuente; terminada, en «Lo que viene»", () => {
    expect(pointAt(points, 0)).toEqual(SOURCE_POINT);
    expect(pointAt(points, points.length + 1).x).toBeCloseTo(DEST_POINT.x);
  });

  it("las cajas de desvío no se pisan ni se salen del mapa", () => {
    const centers = exitCenters([300, 320, 700, 900]);
    for (let index = 1; index < centers.length; index += 1) {
      expect((centers[index] ?? 0) - (centers[index - 1] ?? 0)).toBeGreaterThanOrEqual(EXIT_W);
    }
    expect((centers.at(-1) ?? 0) + EXIT_W / 2).toBeLessThanOrEqual(MAP_W);
    expect((centers[0] ?? 0) - EXIT_W / 2).toBeGreaterThanOrEqual(0);
  });
});
