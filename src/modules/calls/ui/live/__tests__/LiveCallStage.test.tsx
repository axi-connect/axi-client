import { render, screen } from "@testing-library/react";

import { LiveCallStage } from "../LiveCallStage";

jest.mock("framer-motion", () => ({ useReducedMotion: () => true }));
jest.mock("@/modules/calls/ui/components/aura/CallAura", () => ({ CallAura: () => null }));

const LONG =
  "Claro, te cuento un poco sobre nosotros. En Juanito Xpeditions ofrecemos expediciones grupales premium a destinos increíbles como Egipto, Jordania, Islandia y Tailandia.";

function renderStage(text: string) {
  return render(
    <LiveCallStage
      mode="agent"
      who="Habla Juanito"
      phrase={{ role: "agent", text, dim: false, msPerWord: 250 }}
      clock="1:03"
      ticking
      agentName="Asesor Juanito"
      names={{ agent: "Juanito", caller: "el cliente" }}
    />,
  );
}

/** jsdom no maquetea: el alto de la frase y el de su caja se fijan a mano. */
function mockHeights(text: number, box: number) {
  jest.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(text);
  jest.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(box);
}

describe("LiveCallStage · respuestas largas (hotfix)", () => {
  afterEach(() => jest.restoreAllMocks());

  it("una frase que no cabe se recorta por arriba y deja ver el final, con desvanecido", () => {
    mockHeights(828, 207);
    renderStage(LONG);
    const phrase = screen.getByText(/Tailandia\./).closest("p");
    const box = phrase?.parentElement;
    expect(box).toHaveAttribute("data-clipped", "true");
    expect(box?.className).toContain("justify-end");
    expect(box?.className).toContain("mask-image");
    // Completa sigue en el DOM (la conversación y el historial la tienen legible)
    expect(phrase?.textContent).toContain("Claro, te cuento");
  });

  it("una frase corta no se toca", () => {
    mockHeights(41, 207);
    renderStage("Hola, ¿hablo con Laura?");
    const box = screen.getByText(/Laura/).closest("p")?.parentElement;
    expect(box).toHaveAttribute("data-clipped", "false");
    expect(box?.className).not.toContain("mask-image");
  });
});
