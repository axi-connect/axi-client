import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";

const mockAnimate = jest.fn(() => ({ stop: () => {} }));
let mockReduced = true;
jest.mock("framer-motion", () => ({
  useReducedMotion: () => mockReduced,
  animate: (...args: unknown[]) => mockAnimate(...(args as [])),
}));

import { ROUTE_TRACK_MIX_PCT, RouteLine } from "../RouteLine";

/** Contraste WCAG entre dos colores sRGB (0–255). */
function contrast(a: readonly number[], b: readonly number[]): number {
  const lum = (c: readonly number[]) => {
    const [r, g, bl] = c.map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
/** `color-mix(in srgb, A p%, B)`: interpolación en sRGB codificado, como el navegador. */
const mix = (a: number[], b: number[], p: number) => a.map((v, i) => v * p + b[i] * (1 - p));

/** Lee `--background`/`--foreground` del primer bloque `selector {` de globals.css. */
function tokens(css: string, selector: string): { bg: number[]; fg: number[] } {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  const read = (name: string) => {
    const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(block);
    if (match === null) throw new Error(`sin --${name} en ${selector}`);
    return hex(match[1]);
  };
  return { bg: read("background"), fg: read("foreground") };
}

describe("RouteLine · accesibilidad (F8)", () => {
  beforeEach(() => {
    mockAnimate.mockClear();
    mockReduced = true;
  });

  it("es una imagen con la frase entera, con las cifras si el padre las da", () => {
    render(
      <RouteLine
        done={0.63}
        expected={0.77}
        projected={0.82}
        progress={1}
        figures={{ actual: "$ 18,9 M", target: "$ 30.000.000", projected: "cierre ≈ $ 24,6 M · 82 %" }}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: "Ruta del mes: $ 18,9 M de $ 30.000.000, 63 % recorrido, 77 % esperado a hoy, proyección cierre ≈ $ 24,6 M · 82 %",
      }),
    ).toBeInTheDocument();
  });

  it("con prefers-reduced-motion no anima: la línea nace completa", () => {
    const { container } = render(<RouteLine done={0.5} />);
    expect(mockAnimate).not.toHaveBeenCalled();
    // El tramo recorrido (el trazo con gradiente) ya llega a la mitad.
    const doneLine = container.querySelector('line[stroke^="url(#"]');
    expect(doneLine?.getAttribute("x2")).toBe(`${String(1.2 + 0.5 * (100 - 2 * 1.2))}%`);
  });

  it("sin reduced-motion sí anima (un solo motor)", () => {
    mockReduced = false;
    render(<RouteLine done={0.5} />);
    expect(mockAnimate).toHaveBeenCalledTimes(1);
  });

  it("la pista contrasta ≥ 3:1 con el fondo en claro y en oscuro (WCAG 1.4.11)", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const selector of [":root", ".dark"]) {
      const { bg, fg } = tokens(css, selector);
      const track = mix(fg, bg, ROUTE_TRACK_MIX_PCT / 100);
      expect(contrast(track, bg)).toBeGreaterThanOrEqual(3);
    }
  });

  it("la pista usa ese mismo porcentaje (no un token de superficie)", () => {
    const { container } = render(<RouteLine done={0.2} progress={1} />);
    const track = container.querySelector("line");
    expect(track?.getAttribute("stroke")).toBe(
      `color-mix(in srgb, var(--foreground) ${String(ROUTE_TRACK_MIX_PCT)}%, var(--background))`,
    );
  });
});
