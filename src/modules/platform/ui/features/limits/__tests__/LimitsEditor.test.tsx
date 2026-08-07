import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { newLimitRow, type LimitInput } from "../../../../domain/limits";
import { LimitsEditor } from "../LimitsEditor";

/** Arnés controlado: expone el estado real como lo haría el form padre. */
function Harness({ initial }: { initial: LimitInput[] }) {
  const [limits, setLimits] = useState(initial);
  return (
    <>
      <LimitsEditor value={limits} onChange={setLimits} />
      <output data-testid="state">{JSON.stringify(limits)}</output>
    </>
  );
}

const readState = (): LimitInput[] =>
  JSON.parse(screen.getByTestId("state").textContent ?? "[]");

describe("LimitsEditor", () => {
  it("la métrica de voz muestra el preview en notas (caracteres → notas)", () => {
    render(
      <Harness
        initial={[
          {
            ...newLimitRow(),
            metric: "tts_characters",
            period: "billing_cycle",
            limit_value: 400_000,
          },
        ]}
      />,
    );
    expect(screen.getByText("≈ 400.000 caracteres ≈ 1.429 notas de voz")).toBeInTheDocument();
  });

  it("activar cost cap fuerza billing_cycle y bloquea el periodo con candado", () => {
    render(<Harness initial={[{ ...newLimitRow(), period: "day" }]} />);

    fireEvent.click(screen.getByRole("switch", { name: "Cost cap del límite 1" }));

    const state = readState();
    expect(state[0].is_cost_limit).toBe(true);
    expect(state[0].period).toBe("billing_cycle");
    // El select de periodo desaparece: queda el candado "Ciclo".
    expect(screen.queryByLabelText("Periodo del límite 1")).not.toBeInTheDocument();
    expect(screen.getByText("Ciclo")).toBeInTheDocument();
  });

  it("con un cost cap existente, el toggle de otra fila queda deshabilitado", () => {
    render(
      <Harness
        initial={[
          { ...newLimitRow(), is_cost_limit: true, period: "billing_cycle" },
          { ...newLimitRow(), metric: "messages_sent" },
        ]}
      />,
    );

    const blocked = screen.getByRole("switch", { name: "Cost cap del límite 2 (deshabilitado)" });
    expect(blocked).toBeDisabled();
    // El del cost cap vigente sigue operable (para poder apagarlo).
    expect(screen.getByRole("switch", { name: "Cost cap del límite 1" })).toBeEnabled();
  });

  it("añadir y eliminar filas actualiza el set y el contador", () => {
    render(<Harness initial={[newLimitRow()]} />);
    expect(screen.getByText("1 / 30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /añadir límite/i }));
    expect(readState()).toHaveLength(2);
    expect(screen.getByText("2 / 30")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eliminar límite 1" }));
    expect(readState()).toHaveLength(1);
  });

  it("pinta issues por fila y globales", () => {
    render(
      <>
        <LimitsEditor
          value={[newLimitRow()]}
          onChange={() => {}}
          issues={[
            { row: 0, message: "El valor debe ser mayor que 0." },
            { row: -1, message: "Máximo 30 límites por set (hay 31)." },
          ]}
        />
      </>,
    );
    expect(screen.getByText("El valor debe ser mayor que 0.")).toBeInTheDocument();
    expect(screen.getByText(/máximo 30 límites/i)).toBeInTheDocument();
  });
});
