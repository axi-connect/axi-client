import { render } from "@testing-library/react";

import { ASSISTANT_EXPRESSION_NAMES } from "@/shared/components/features/assistant/avatar/avatar-rig";
import { AssistantAvatar } from "../AssistantAvatar";

/**
 * El presupuesto de rendimiento de la cara, ejecutable. Cada aserción es un
 * número del plan (docs/plans/cmo_axel_avatar_plan.md §6): si alguien añade un
 * `<filter>` para «mejorar el brillo» o cien nodos para una ceja, este test lo
 * cuenta antes que el Performance panel.
 */
describe("AssistantAvatar — presupuesto", () => {
  it("cabe en 70 nodos y 6 gradientes", () => {
    const { container } = render(<AssistantAvatar expression="neutral" accessory="headset" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll("*").length).toBeLessThanOrEqual(70);
    expect(svg?.querySelectorAll("radialGradient, linearGradient").length).toBeLessThanOrEqual(6);
  });

  it("no usa filtros, ni backdrop-filter, ni un solo hex: el material vive en globals.css", () => {
    const { container } = render(<AssistantAvatar expression="proud" />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/<filter/i);
    expect(html).not.toMatch(/filter=/i);
    expect(html).not.toMatch(/backdrop-filter/i);
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b(?![-:])/i);
    // Ningún color en atributos: los `stop` y las capas se pintan por CSS.
    expect(html).not.toMatch(/stop-color=/i);
  });

  it("es decorativo: aria-hidden y sin <title>", () => {
    const { container } = render(<AssistantAvatar expression="neutral" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
    expect(svg?.querySelector("title")).toBeNull();
  });

  it.each(ASSISTANT_EXPRESSION_NAMES)("«%s» viaja en data-expression y en las variables del rig", (name) => {
    const { container } = render(<AssistantAvatar expression={name} transitionMs={0} />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.expression).toBe(name);
    expect(svg.style.getPropertyValue("--av-yaw")).not.toBe("");
    expect(svg.style.getPropertyValue("--av-mouth")).not.toBe("");
    expect(svg.style.getPropertyValue("--av-dur")).toBe("0ms");
  });

  it("la diadema es una capa que solo el data-acc enciende", () => {
    const { container, rerender } = render(<AssistantAvatar expression="neutral" accessory="none" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.acc).toBe("none");
    expect(svg.querySelector('[data-acc-part="headset"]')).not.toBeNull();
    rerender(<AssistantAvatar expression="neutral" accessory="headset" />);
    expect(svg.dataset.acc).toBe("headset");
  });

  it("dos caras en la misma página no comparten defs", () => {
    const { container } = render(
      <>
        <AssistantAvatar expression="neutral" />
        <AssistantAvatar expression="proud" />
      </>,
    );
    const ids = [...container.querySelectorAll("defs [id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
