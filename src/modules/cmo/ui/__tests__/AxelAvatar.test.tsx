import { render } from "@testing-library/react";

import { AXEL_EXPRESSION_NAMES } from "@/modules/cmo/domain/axel-avatar";
import { AxelAvatar } from "../components/AxelAvatar";

/**
 * El presupuesto de rendimiento de la cara, ejecutable. Cada aserción es un
 * número del plan (docs/plans/cmo_axel_avatar_plan.md §6): si alguien añade un
 * `<filter>` para «mejorar el brillo» o cien nodos para una ceja, este test lo
 * cuenta antes que el Performance panel.
 */
describe("AxelAvatar — presupuesto", () => {
  it("cabe en 70 nodos y 6 gradientes", () => {
    const { container } = render(<AxelAvatar expression="neutral" accessory="headset" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll("*").length).toBeLessThanOrEqual(70);
    expect(svg?.querySelectorAll("radialGradient, linearGradient").length).toBeLessThanOrEqual(6);
  });

  it("no usa filtros, ni backdrop-filter, ni un solo hex: el material vive en globals.css", () => {
    const { container } = render(<AxelAvatar expression="proud" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/<filter/i);
    expect(html).not.toMatch(/filter=/i);
    expect(html).not.toMatch(/backdrop-filter/i);
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b(?![-:])/i);
    // Ningún color en atributos: los `stop` y las capas se pintan por CSS.
    expect(html).not.toMatch(/stop-color=/i);
  });

  it("es decorativo: aria-hidden y sin <title>", () => {
    const { container } = render(<AxelAvatar expression="neutral" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.querySelector("title")).toBeNull();
  });

  it.each(AXEL_EXPRESSION_NAMES)("«%s» viaja en data-expression y en las variables del rig", (name) => {
    const { container } = render(<AxelAvatar expression={name} transitionMs={0} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.expression).toBe(name);
    expect(svg.style.getPropertyValue("--axel-yaw")).not.toBe("");
    expect(svg.style.getPropertyValue("--axel-mouth")).not.toBe("");
    expect(svg.style.getPropertyValue("--axel-dur")).toBe("0ms");
  });

  it("la diadema es una capa que solo el data-acc enciende", () => {
    const { container, rerender } = render(<AxelAvatar expression="neutral" accessory="none" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.acc).toBe("none");
    expect(svg.querySelector('[data-acc-part="headset"]')).not.toBeNull();
    rerender(<AxelAvatar expression="neutral" accessory="headset" />);
    expect(svg.dataset.acc).toBe("headset");
  });

  it("dos caras en la misma página no comparten defs", () => {
    const { container } = render(
      <>
        <AxelAvatar expression="neutral" />
        <AxelAvatar expression="proud" />
      </>,
    );
    const ids = [...container.querySelectorAll("defs [id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
