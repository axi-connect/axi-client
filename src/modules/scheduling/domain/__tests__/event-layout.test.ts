import { layoutDayEvents } from "../event-layout";

const event = (id: string, startMin: number, endMin: number) => ({ id, startMin, endMin });

describe("layoutDayEvents", () => {
  it("sin solapes → todos a columna 0 de 1", () => {
    const boxes = layoutDayEvents([event("a", 540, 585), event("b", 600, 630)]);
    expect(boxes).toEqual([
      { id: "a", startMin: 540, endMin: 585, column: 0, columns: 1 },
      { id: "b", startMin: 600, endMin: 630, column: 0, columns: 1 },
    ]);
  });

  it("tres citas simultáneas (capacity>1) → tres columnas", () => {
    const boxes = layoutDayEvents([
      event("a", 600, 660),
      event("b", 600, 660),
      event("c", 600, 660),
    ]);
    expect(boxes.map((b) => b.columns)).toEqual([3, 3, 3]);
    expect(new Set(boxes.map((b) => b.column))).toEqual(new Set([0, 1, 2]));
  });

  it("cadena transitiva: a⋂b y b⋂c comparten cluster aunque a⋂̸c", () => {
    const boxes = layoutDayEvents([
      event("a", 540, 600),
      event("b", 570, 630),
      event("c", 610, 660),
    ]);
    // a y c no se tocan → c reutiliza la columna 0; el cluster mide 2 columnas.
    const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
    expect(byId.a.columns).toBe(2);
    expect(byId.b.columns).toBe(2);
    expect(byId.c.columns).toBe(2);
    expect(byId.c.column).toBe(0);
    expect(byId.b.column).toBe(1);
  });

  it("bordes exactos NO solapan: end == start comparte columna", () => {
    const boxes = layoutDayEvents([event("a", 540, 600), event("b", 600, 660)]);
    expect(boxes.every((b) => b.columns === 1 && b.column === 0)).toBe(true);
  });

  it("eventos degenerados (end <= start) ocupan al menos 1 minuto", () => {
    const boxes = layoutDayEvents([event("a", 540, 540), event("b", 540, 570)]);
    expect(boxes).toHaveLength(2);
    expect(boxes.every((b) => b.columns === 2)).toBe(true);
  });

  it("clusters independientes no comparten ancho", () => {
    const boxes = layoutDayEvents([
      event("a", 540, 600),
      event("b", 570, 630),
      event("c", 700, 760),
    ]);
    const byId = Object.fromEntries(boxes.map((b) => [b.id, b]));
    expect(byId.a.columns).toBe(2);
    expect(byId.c.columns).toBe(1);
  });
});
