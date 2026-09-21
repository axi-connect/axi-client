import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cssEase, spring, springToLinear } from "../motion";

/**
 * Las curvas de la cara de Axel viven DOS veces a propósito: como `linear()`
 * literal en `globals.css` (donde el `@supports` puede darles fallback) y como
 * valor calculado en `motion.ts` (la fuente de verdad de la coreografía). Este
 * test es lo que impide que se desincronicen sin que nadie se entere.
 */
describe("springToLinear", () => {
  it("empieza en 0, termina en 1 y no tiene NaN", () => {
    const curve = springToLinear(spring.soft.stiffness, spring.soft.damping);
    expect(curve.startsWith("linear(0, ")).toBe(true);
    expect(curve.endsWith(", 1)")).toBe(true);
    expect(curve).not.toContain("NaN");
  });

  it("el resorte rápido rebasa la meta (overshoot) y el suave no", () => {
    const values = (curve: string) => curve.slice("linear(".length, -1).split(", ").map(Number);
    expect(Math.max(...values(cssEase.snappy))).toBeGreaterThan(1);
    expect(Math.max(...values(cssEase.spring))).toBeLessThanOrEqual(1);
  });
});

describe("globals.css está en sincronía con cssEase", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

  it("--av-ease-spring", () => {
    expect(css).toContain(`--av-ease-spring: ${cssEase.spring};`);
  });
  it("--av-ease-snappy", () => {
    expect(css).toContain(`--av-ease-snappy: ${cssEase.snappy};`);
  });
  it("--av-ease-smooth", () => {
    expect(css).toContain(`--av-ease-smooth: ${cssEase.smooth};`);
  });
  it("el fallback sin linear() usa la curva documentada", () => {
    expect(css).toContain(`--av-ease-spring: ${cssEase.fallback};`);
  });
});
