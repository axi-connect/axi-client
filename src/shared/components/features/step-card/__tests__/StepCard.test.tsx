import { fireEvent, render, screen } from "@testing-library/react";

import { StepCard } from "../StepCard";

describe("StepCard", () => {
  it("cerrada dice su resumen y «Editar»; el botón abre el panel que controla", () => {
    const onToggle = jest.fn();
    const { rerender } = render(
      <StepCard id="paso" index={2} title="La oferta" summary="Plan Pro" state="done" open={false} onToggle={onToggle}>
        <p>campos</p>
      </StepCard>,
    );
    const button = screen.getByRole("button", { name: /La oferta/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Plan Pro")).toBeInTheDocument();
    expect(screen.getByText("Editar")).toBeInTheDocument();
    expect(screen.queryByText("campos")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(
      <StepCard id="paso" index={2} title="La oferta" summary="Plan Pro" state="done" open onToggle={onToggle}>
        <p>campos</p>
      </StepCard>,
    );
    expect(button).toHaveAttribute("aria-controls", "paso-2");
    expect(document.getElementById("paso-2")).toHaveTextContent("campos");
    expect(screen.getByText("Listo")).toBeInTheDocument();
    expect(screen.queryByText("Plan Pro")).not.toBeInTheDocument();
  });

  it("bloqueada lleva «!» y lo dice al lector; la cara `chevron` no dice «Editar»", () => {
    render(
      <StepCard id="p" index={1} title="Dónde busca" summary="—" state="blocked" open={false} onToggle={() => undefined} variant="chevron" blockedHint="tiene algo por corregir">
        <p>campos</p>
      </StepCard>,
    );
    expect(screen.getByRole("button", { name: /Dónde busca \(tiene algo por corregir\)/ })).toBeInTheDocument();
    expect(screen.getByText("!")).toBeInTheDocument();
    expect(screen.queryByText("Editar")).not.toBeInTheDocument();
  });
});
