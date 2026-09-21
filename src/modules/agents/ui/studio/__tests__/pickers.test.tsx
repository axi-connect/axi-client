import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import type { AgentCharacter, AgentColor } from "@/modules/agents/domain/agent";
import { CharacterPicker } from "../CharacterPicker";
import { ColorPalette } from "../ColorPalette";

function CharacterHarness() {
  const [value, setValue] = useState<AgentCharacter>("nova");
  return <CharacterPicker value={value} color="coral" onChange={setValue} />;
}

function ColorHarness() {
  const [value, setValue] = useState<AgentColor>("white");
  return <ColorPalette value={value} onChange={setValue} />;
}

describe("CharacterPicker", () => {
  it("es un radiogroup con los tres personajes de plataforma; cada tile es un avatar ESTÁTICO del color elegido", () => {
    const { container } = render(<CharacterHarness />);
    const group = screen.getByRole("radiogroup", { name: "Personaje" });
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /nova/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /cloudee/i })).toHaveAttribute("aria-checked", "false");
    // roving tabindex: solo el activo entra en el orden de tabulación
    expect(radios.filter((radio) => radio.getAttribute("tabindex") === "0")).toHaveLength(1);
    expect(container.querySelectorAll('svg[data-color="coral"]')).toHaveLength(3);
    expect(container.querySelector('svg[data-character="strobi"]')).not.toBeNull();
    expect(group).toBeInTheDocument();
  });

  it("cambia con click y con las flechas (cíclico)", () => {
    render(<CharacterHarness />);
    fireEvent.click(screen.getByRole("radio", { name: /strobi/i }));
    expect(screen.getByRole("radio", { name: /strobi/i })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Personaje" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /cloudee/i })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Personaje" }), { key: "End" });
    expect(screen.getByRole("radio", { name: /strobi/i })).toHaveAttribute("aria-checked", "true");
  });
});

describe("ColorPalette", () => {
  it("ocho swatches con nombre accesible (la palabra, no el color) que toman el material del rig por data-color", () => {
    render(<ColorHarness />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(8);
    expect(screen.getByRole("radio", { name: "Blanco" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Coral" })).toHaveAttribute("data-color", "coral");
    expect(screen.getByRole("radio", { name: "Coral" })).toHaveClass("assistant-avatar");
  });

  it("cambia con click y con flechas", () => {
    render(<ColorHarness />);
    fireEvent.click(screen.getByRole("radio", { name: "Menta" }));
    expect(screen.getByRole("radio", { name: "Menta" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radiogroup", { name: "Color del personaje" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Violeta" })).toHaveAttribute("aria-checked", "true");
  });
});
