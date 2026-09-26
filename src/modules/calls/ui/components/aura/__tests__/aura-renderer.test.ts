import { idleTone, parseCssColor } from "../aura-renderer";

describe("paleta del aura desde tokens (premium F2)", () => {
  it("entiende los formatos en que el navegador devuelve un token de color", () => {
    expect(parseCssColor("#7c3aed")).toEqual([124, 58, 237]);
    expect(parseCssColor(" #FB7185 ")).toEqual([251, 113, 133]);
    expect(parseCssColor("#abc")).toEqual([170, 187, 204]);
    expect(parseCssColor("rgb(230, 87, 89)")).toEqual([230, 87, 89]);
    expect(parseCssColor("rgb(230 87 89 / 50%)")).toEqual([230, 87, 89]);
  });

  it("lo que no entiende devuelve null (el aura no se pinta con un color inventado)", () => {
    expect(parseCssColor("")).toBeNull();
    expect(parseCssColor("oklch(0.7 0.1 30)")).toBeNull();
    expect(parseCssColor("var(--axi-violet)")).toBeNull();
  });

  it("el gris del silencio no tiene saturación visible", () => {
    const [r, g, b] = idleTone([124, 58, 237]);
    expect(Math.abs(r - g)).toBeLessThan(1);
    expect(b - r).toBeLessThanOrEqual(8);
  });
});
