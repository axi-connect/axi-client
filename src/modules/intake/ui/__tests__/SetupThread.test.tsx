import { fireEvent, render, screen, within } from "@testing-library/react";

import type { UiMessage } from "@/modules/intake/infrastructure/stores/intake.store";
import { SetupThread } from "../components/SetupThread";

/**
 * Lo que es del intake dentro del hilo compartido: la línea «Anotado», los
 * textos de la pregunta en boca de Alba, y que solo la ÚLTIMA pregunta se
 * pueda tocar aunque el último mensaje no sea una pregunta.
 */

function message(over: Partial<UiMessage>): UiMessage {
  return {
    id: "m1",
    role: "assistant",
    body: "Perfecto.",
    question: null,
    captured: [],
    voice: false,
    created_at: "2026-09-18T10:00:00.000Z",
    ...over,
  };
}

const QUESTION = {
  question: "¿Cómo quieres que le hable a tus clientas?",
  options: [
    { label: "Cercano, de tú", hint: "Como en tus historias" },
    { label: "Profesional, de usted", hint: null },
  ],
  allow_free_text: true,
};

function view(messages: UiMessage[], over: Partial<Parameters<typeof SetupThread>[0]> = {}) {
  const onPick = jest.fn();
  const onWriteInstead = jest.fn();
  const onRetry = jest.fn();
  render(
    <SetupThread
      messages={messages}
      assistantName="Alba"
      thinking={false}
      turnError={null}
      onPick={onPick}
      onWriteInstead={onWriteInstead}
      onRetry={onRetry}
      {...over}
    />,
  );
  return { onPick, onWriteInstead, onRetry };
}

describe("el hilo de la entrevista", () => {
  it("lo capturado es UNA línea bajo la respuesta: Anotado · etiqueta · etiqueta", () => {
    view([
      message({
        captured: [
          { code: "hours", label: "Horario" },
          { code: "city", label: "Ciudad" },
        ],
      }),
    ]);
    const log = screen.getByRole("log", { name: "Conversación con Alba" });
    expect(within(log).getByText("Anotado")).toBeInTheDocument();
    expect(within(log).getByText("Horario")).toBeInTheDocument();
    expect(within(log).getByText("Ciudad")).toBeInTheDocument();
  });

  it("solo la última pregunta está viva, y sus textos son los de Alba", () => {
    const { onPick, onWriteInstead } = view([
      message({ id: "q1", question: QUESTION }),
      message({ id: "c1", role: "client", body: "Cercano, de tú" }),
      message({ id: "q2", question: QUESTION, body: "" }),
      message({ id: "a3", body: "Anotado. Sigamos." }),
    ]);
    expect(screen.getByText("Ya respondida")).toBeInTheDocument();
    expect(screen.getByText("Elige una")).toBeInTheDocument();
    const live = screen.getAllByRole("button", { name: /Profesional, de usted/ }).find((b) => !b.hasAttribute("disabled"));
    expect(live).toBeDefined();
    fireEvent.click(live!);
    expect(onPick).toHaveBeenCalledWith("Profesional, de usted");
    fireEvent.click(screen.getByRole("button", { name: "Prefiero contarlo yo" }));
    expect(onWriteInstead).toHaveBeenCalledTimes(1);
  });

  it("un mensaje del cliente fallido conserva el texto y reintenta con el error del turno", () => {
    const { onRetry } = view([message({ id: "c1", role: "client", body: "Abrimos a las 9", failed: true, voice: true })], {
      turnError: "Se cayó la conexión.",
    });
    expect(screen.getByText("Abrimos a las 9")).toBeInTheDocument();
    expect(screen.getByText("Se cayó la conexión.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Reintentar/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("dictado lleva su pie; pensando pinta los tres puntos, no frases inventadas", () => {
    view([message({ id: "c1", role: "client", body: "Hola", voice: true })], { thinking: true });
    expect(screen.getByText("Dictado")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Está pensando" })).toBeInTheDocument();
    expect(screen.queryByText(/Revisando/)).not.toBeInTheDocument();
  });
});
