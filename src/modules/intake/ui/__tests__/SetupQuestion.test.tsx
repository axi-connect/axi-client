import { fireEvent, render, screen } from "@testing-library/react";

import type { IntakeQuestion } from "@/modules/intake/domain/intake";
import { SetupQuestion } from "../components/SetupQuestion";

/**
 * Lo que se prueba aquí es QUIÉN puede contestar y CUÁNDO.
 *
 * El riesgo no es visual: es que alguien conteste a una pregunta de hace diez
 * mensajes cuya conversación ya cambió de rumbo, o que un toque mande algo
 * distinto de lo que dice el botón.
 */

const QUESTION: IntakeQuestion = {
  question: "¿Abren los domingos?",
  options: [
    { label: "Sí, medio día", hint: "Hasta la 1 p. m." },
    { label: "No, descansamos", hint: null },
  ],
  allow_free_text: true,
};

function view(over: Partial<Parameters<typeof SetupQuestion>[0]> = {}) {
  const onPick = jest.fn();
  const onWriteInstead = jest.fn();
  render(
    <SetupQuestion
      question={QUESTION}
      live
      busy={false}
      onPick={onPick}
      onWriteInstead={onWriteInstead}
      {...over}
    />,
  );
  return { onPick, onWriteInstead };
}

describe("la pregunta con opciones de la entrevista", () => {
  it("manda EXACTAMENTE el texto del botón, no un índice ni un id", () => {
    const { onPick } = view();
    fireEvent.click(screen.getByRole("button", { name: /Sí, medio día/ }));
    expect(onPick).toHaveBeenCalledWith("Sí, medio día");
  });

  it("una pregunta vieja se lee pero no se toca", () => {
    const { onPick } = view({ live: false });
    const option = screen.getByRole("button", { name: /No, descansamos/ });
    expect(option).toBeDisabled();
    fireEvent.click(option);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("mientras el asistente trabaja, nada se puede contestar", () => {
    const { onPick } = view({ busy: true });
    fireEvent.click(screen.getByRole("button", { name: /Sí, medio día/ }));
    expect(onPick).not.toHaveBeenCalled();
  });

  /** La vía de escape no envía nada: lleva el foco al compositor. */
  it("«prefiero contarlo yo» enfoca el compositor en vez de enviar", () => {
    const { onPick, onWriteInstead } = view();
    fireEvent.click(screen.getByRole("button", { name: /Prefiero contarlo yo/ }));
    expect(onWriteInstead).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("sin texto libre no se ofrece la vía de escape", () => {
    view({ question: { ...QUESTION, allow_free_text: false } });
    expect(screen.queryByRole("button", { name: /Prefiero contarlo yo/ })).toBeNull();
  });

  it("una opción sin pista no pinta una línea vacía", () => {
    view();
    const option = screen.getByRole("button", { name: /No, descansamos/ });
    expect(option.textContent).toBe("No, descansamos");
  });
});
