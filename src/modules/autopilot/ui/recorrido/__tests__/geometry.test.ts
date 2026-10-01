import { EXIT_W, exitCenters, MAP_W, SOURCE_POINT, splitRoute, stopPoints } from "../geometry";

/** La geometría del recorrido: el corte en el avión y las salidas que no se pisan. */
describe("geometry", () => {
  const points = stopPoints(7);

  it("partir en una parada entera deja lo de atrás sólido hasta ella y el avión encima", () => {
    const { plane, done, todo } = splitRoute(points, 3);
    expect(plane.x).toBeCloseTo(points[2]?.x ?? 0);
    expect(plane.y).toBeCloseTo(points[2]?.y ?? 0);
    expect(done.startsWith(`M${String(SOURCE_POINT.x)} ${String(SOURCE_POINT.y)}`)).toBe(true);
    expect(todo).not.toBe("");
  });

  it("a mitad de tramo el avión cae entre las dos paradas y un trazo empieza donde acaba el otro", () => {
    const { plane, done, todo } = splitRoute(points, 2.5);
    expect(plane.x).toBeGreaterThan(points[1]?.x ?? 0);
    expect(plane.x).toBeLessThan(points[2]?.x ?? 0);
    const end = done.split(" ").slice(-2).join(" ");
    expect(todo.startsWith(`M${end}`)).toBe(true);
  });

  it("fuera de rango se acota: antes de la fuente y después de la última", () => {
    expect(splitRoute(points, -1).plane).toEqual(SOURCE_POINT);
    expect(splitRoute(points, 99).plane.x).toBeCloseTo(points.at(-1)?.x ?? 0);
  });

  it("las cajas de salida no se pisan ni se salen del mapa", () => {
    const centers = exitCenters([300, 310, 700, 820]);
    for (let index = 1; index < centers.length; index += 1) {
      expect((centers[index] ?? 0) - (centers[index - 1] ?? 0)).toBeGreaterThanOrEqual(EXIT_W);
    }
    expect((centers.at(-1) ?? 0) + EXIT_W / 2).toBeLessThanOrEqual(MAP_W);
    expect((centers[0] ?? 0) - EXIT_W / 2).toBeGreaterThanOrEqual(0);
  });
});
