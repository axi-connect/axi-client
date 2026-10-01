import { airway } from "../airChart";
import { AXI_AT, EXIT_W, exitCenters, flowWidth, splitCubic } from "../geometry";

/** La geometría de la carta: el grosor, el corte en el avión y los desvíos que no se pisan. */
describe("geometry", () => {
  it("el grosor es 2 + 4·√(n/max): 2 px sin nadie, 6 px con todas; sin dato, nada", () => {
    expect(flowWidth(0, 25)).toBe(2);
    expect(flowWidth(25, 25)).toBe(6);
    expect(flowWidth(null, 25)).toBe(0);
  });

  it("partir un tramo de la aerovía en el avión: un solo trazo, y el avión cae antes de su fijo", () => {
    const { fixes, segments } = airway(7);
    const cubic = segments[2];
    if (cubic === undefined) throw new Error("sin tramo");
    const [behind, ahead] = splitCubic(cubic, AXI_AT);
    // Lo de delante empieza donde acaba lo de atrás, y los extremos son los del tramo.
    expect(ahead[0]).toEqual(behind[3]);
    expect(behind[0]).toEqual(cubic[0]);
    expect(ahead[3]).toEqual(fixes[2]);
    expect(behind[3].x).toBeGreaterThan(fixes[1]?.x ?? 0);
    expect(behind[3].x).toBeLessThan(fixes[2]?.x ?? 0);
  });

  it("la aerovía va de la torre al aeropuerto pasando por cada fijo", () => {
    for (const count of [6, 7]) {
      const { fixes, segments } = airway(count);
      expect(fixes).toHaveLength(count);
      expect(segments).toHaveLength(count + 1);
      segments.slice(0, -1).forEach((segment, index) => expect(segment[3]).toEqual(fixes[index]));
    }
  });

  it("las cajas de desvío no se pisan ni se salen del mapa", () => {
    const centers = exitCenters([300, 320, 700, 900]);
    for (let index = 1; index < centers.length; index += 1) {
      expect((centers[index] ?? 0) - (centers[index - 1] ?? 0)).toBeGreaterThanOrEqual(EXIT_W);
    }
    expect((centers.at(-1) ?? 0) + EXIT_W / 2).toBeLessThanOrEqual(1000);
    expect((centers[0] ?? 0) - EXIT_W / 2).toBeGreaterThanOrEqual(0);
  });
});
