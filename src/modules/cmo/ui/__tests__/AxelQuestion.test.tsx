import { act, fireEvent, render, screen } from "@testing-library/react";

import type { CmoQuestionDTO } from "@/modules/cmo/domain/cmo";
import { AxelQuestion } from "../components/AxelQuestion";

/**
 * Lo que se prueba aquí es QUIÉN puede responder y CUÁNDO.
 *
 * El riesgo no es visual: es que el dueño pueda contestar a una pregunta de hace
 * diez mensajes cuya conversación ya cambió de rumbo, o que un clic mande algo
 * distinto de lo que dice el botón.
 */

const QUESTION: CmoQuestionDTO = {
  question: "¿A quién le apuntamos con la campaña?",
  options: [
    { label: "Los que compraron y no volvieron", hint: "Unos 240 contactos" },
    { label: "Los que preguntaron y no compraron", hint: null },
  ],
  allow_free_text: true,
};

function view(over: Partial<Parameters<typeof AxelQuestion>[0]> = {}) {
  const onPick = jest.fn();
  const onWriteInstead = jest.fn();
  render(
    <AxelQuestion
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

describe("la pregunta con opciones de Axel", () => {
  it("manda EXACTAMENTE el texto del botón, no un índice ni un id", () => {
    const { onPick } = view();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Los que compraron/ }));
    });

    // Es lo que el dueño ve escrito y lo que va a aparecer como su mensaje en el
    // hilo: cualquier otra cosa haría que el hilo dijera algo que él no eligió.
    expect(onPick).toHaveBeenCalledWith("Los que compraron y no volvieron");
  });

  it("las opciones son BOTONES, no adorno", () => {
    view();

    // A diferencia del espejo de mensajes interactivos del inbox, donde son
    // `<div>` porque el operador no puede responder por el cliente. Aquí el
    // dueño ES quien responde.
    expect(screen.getAllByRole("button", { name: /Los que/ })).toHaveLength(2);
  });

  it("muestra el matiz de cada opción cuando lo hay, y no inventa uno cuando no", () => {
    view();

    expect(screen.getByText("Unos 240 contactos")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Los que preguntaron y no compraron/ }),
    ).toBeVisible();
  });

  it("una pregunta que no es la última del hilo se lee pero no se toca", () => {
    view({ live: false });

    for (const option of screen.getAllByRole("button")) {
      expect(option).toBeDisabled();
    }
    // Y se sigue leyendo: es parte del hilo, y explica qué se decidió.
    expect(screen.getByText("¿A quién le apuntamos con la campaña?")).toBeVisible();
    expect(screen.getByText("Pregunta anterior")).toBeVisible();
  });

  it("mientras Axel trabaja no se puede responder", () => {
    view({ busy: true });

    for (const option of screen.getAllByRole("button")) {
      expect(option).toBeDisabled();
    }
  });

  it("«Otra cosa…» no responde: manda a escribir", () => {
    const { onPick, onWriteInstead } = view();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Otra cosa/ }));
    });

    // Mandarle un «otra cosa» literal a Axel no le diría nada.
    expect(onPick).not.toHaveBeenCalled();
    expect(onWriteInstead).toHaveBeenCalledTimes(1);
  });

  it("sin salida libre no ofrece escribir", () => {
    view({ question: { ...QUESTION, allow_free_text: false } });

    expect(screen.queryByRole("button", { name: /Otra cosa/ })).toBeNull();
  });

  it("en una pregunta vieja tampoco ofrece escribir", () => {
    view({ live: false });

    expect(screen.queryByRole("button", { name: /Otra cosa/ })).toBeNull();
  });
});
