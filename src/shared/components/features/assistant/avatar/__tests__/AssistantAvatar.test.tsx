import { render } from "@testing-library/react";

import { ASSISTANT_CHARACTERS } from "@/shared/components/features/assistant/avatar/avatar-characters";
import { ASSISTANT_EXPRESSION_NAMES } from "@/shared/components/features/assistant/avatar/avatar-rig";
import { AssistantAvatar } from "../AssistantAvatar";

/**
 * El presupuesto de rendimiento de la cara, ejecutable. Cada aserción es un
 * número del plan (docs/plans/cmo_axel_avatar_plan.md §6): si alguien añade un
 * `<filter>` para «mejorar el brillo» o cien nodos para una ceja, este test lo
 * cuenta antes que el Performance panel.
 */
describe("AssistantAvatar — presupuesto", () => {
  it.each(ASSISTANT_CHARACTERS)("«%s» cabe en 70 nodos y 6 gradientes", (character) => {
    const { container } = render(<AssistantAvatar expression="neutral" accessory="headset" character={character} color="coral" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelectorAll("*").length).toBeLessThanOrEqual(70);
    expect(svg?.querySelectorAll("radialGradient, linearGradient").length).toBeLessThanOrEqual(6);
  });

  it("sin personaje ni color es Lumo con su material: ni data-color ni diadema distinta", () => {
    const { container } = render(<AssistantAvatar expression="neutral" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.character).toBe("lumo");
    expect(svg.hasAttribute("data-color")).toBe(false);
    expect(svg.style.getPropertyValue("--av-eye-cant")).toBe("0");
    // La geometría aprobada del CMO, literal.
    const body = svg.querySelector(".assistant-rig-body > ellipse");
    expect(body?.getAttribute("rx")).toBe("37");
    expect(body?.getAttribute("ry")).toBe("34.5");
    expect(svg.querySelector('[data-layer="mouth"]')?.getAttribute("d")).toBe("M43 60 Q50 67 57 60");
    expect(svg.querySelector('[data-layer="glint"]')?.getAttribute("cx")).toBe("48.6");
    // El material también: el gradiente del cuerpo es el objectBoundingBox de siempre
    // (auditoría C1-H1: un círculo en espacio de usuario aclaraba la barriga un 5,7 %).
    const gradient = svg.querySelector("defs radialGradient") as SVGRadialGradientElement;
    expect(gradient.hasAttribute("gradientUnits")).toBe(false);
    expect([gradient.getAttribute("cx"), gradient.getAttribute("cy"), gradient.getAttribute("r")]).toEqual(["0.42", "0.32", "0.85"]);
  });

  it("los cuerpos de varias piezas comparten una sola luz (gradiente en espacio de usuario)", () => {
    const { container } = render(<AssistantAvatar expression="neutral" character="cloudee" color="cloud" />);
    const gradient = container.querySelector("defs radialGradient") as SVGRadialGradientElement;
    expect(gradient.getAttribute("gradientUnits")).toBe("userSpaceOnUse");
  });

  it("los personajes de plataforma viajan en data-character/data-color y no tienen diadema", () => {
    const { container } = render(<AssistantAvatar expression="neutral" character="cloudee" color="sky" accessory="headset" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.dataset.character).toBe("cloudee");
    expect(svg.dataset.color).toBe("sky");
    expect(svg.querySelector("[data-acc-part]")).toBeNull();
    // Cuatro piezas de nube, pintadas con el mismo gradiente; el contorno y el clip las repiten sin relleno.
    expect(svg.querySelectorAll(".assistant-rig-body > ellipse, .assistant-rig-body > circle").length).toBe(4);
    expect(svg.querySelectorAll('[data-layer="outline"] > *').length).toBe(4);
  });

  it("la inclinación del ojo es una variable, no un path distinto", () => {
    const { container } = render(<AssistantAvatar expression="neutral" character="nova" />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    expect(svg.style.getPropertyValue("--av-eye-cant")).toBe("7");
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
