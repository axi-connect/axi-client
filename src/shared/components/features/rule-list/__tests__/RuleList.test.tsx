import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { RuleList } from "../RuleList";

function Harness({ initial = [] as string[], max = 3, maxLength = 40 }) {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <>
      <RuleList value={value} onChange={setValue} max={max} maxLength={maxLength} label="Lo que siempre hace" hint="Una idea por regla." example="Confirma talla y color." />
      <output data-testid="value">{JSON.stringify(value)}</output>
    </>
  );
}

const current = () => JSON.parse(screen.getByTestId("value").textContent ?? "[]") as string[];

describe("RuleList", () => {
  it("vacía enseña el ejemplo y el contador 0/max", () => {
    render(<Harness />);
    expect(screen.getByText(/por ejemplo/i)).toBeInTheDocument();
    expect(screen.getByText("Confirma talla y color.")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("añade con Enter, recorta espacios y anuncia; al llegar al tope deshabilita la entrada y lo dice", () => {
    render(<Harness initial={["Una", "Dos"]} />);
    const input = screen.getByLabelText("Nueva regla de Lo que siempre hace");
    fireEvent.change(input, { target: { value: "  Tres  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(current()).toEqual(["Una", "Dos", "Tres"]);
    expect(screen.getByText("3/3")).toBeInTheDocument();
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("placeholder", expect.stringMatching(/máximo 3 reglas/i));
    expect(screen.getByText(/regla añadida \(3 de 3\)/i)).toBeInTheDocument();
  });

  it("edita en su sitio: Enter guarda, Esc cancela, vaciarla la quita", () => {
    render(<Harness initial={["Una", "Dos"]} />);
    fireEvent.click(screen.getByLabelText("Editar la regla 1"));
    const box = screen.getByLabelText("Regla 1");
    fireEvent.change(box, { target: { value: "Uno editado" } });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(current()).toEqual(["Uno editado", "Dos"]);

    fireEvent.click(screen.getByLabelText("Editar la regla 2"));
    const second = screen.getByLabelText("Regla 2");
    fireEvent.change(second, { target: { value: "cambio que no quiero" } });
    fireEvent.keyDown(second, { key: "Escape" });
    expect(current()).toEqual(["Uno editado", "Dos"]);

    fireEvent.click(screen.getByLabelText("Editar la regla 2"));
    fireEvent.change(screen.getByLabelText("Regla 2"), { target: { value: "   " } });
    fireEvent.keyDown(screen.getByLabelText("Regla 2"), { key: "Enter" });
    expect(current()).toEqual(["Uno editado"]);
  });

  it("reordena con los botones y con Alt+flechas; quita con la equis", () => {
    render(<Harness initial={["Una", "Dos", "Tres"]} />);
    fireEvent.click(screen.getAllByLabelText("Bajar")[0]!);
    expect(current()).toEqual(["Dos", "Una", "Tres"]);
    fireEvent.keyDown(screen.getByLabelText("Editar la regla 3"), { key: "ArrowUp", altKey: true });
    expect(current()).toEqual(["Dos", "Tres", "Una"]);
    expect(screen.getAllByLabelText("Subir")[0]).toBeDisabled();
    fireEvent.click(screen.getAllByLabelText("Quitar")[1]!);
    expect(current()).toEqual(["Dos", "Una"]);
  });

  it("una regla más larga que el tope se marca con su contador, no se corta", () => {
    render(<Harness initial={["x".repeat(45)]} maxLength={40} />);
    expect(screen.getByText(/se pasa de 40 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText("45/40")).toBeInTheDocument();
    expect(current()[0]).toHaveLength(45);
  });
});
