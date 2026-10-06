import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { IntakeField } from "@/modules/intake/domain/intake";
import { SetupReviewCard, SetupReviewDone } from "../components/SetupReviewCard";

/**
 * Paso 1 del informe de la entrevista: confirmar JUNTO al dato, con su origen y
 * tres botones con texto que responden al pulsarlos (rec. 1, 2 y 3).
 */

const FIELD: IntakeField = {
  code: "promesa",
  label: "Por qué les compran",
  kind: "long_text",
  required: true,
  help: null,
  options: null,
  value: "Aprender inglés de forma práctica",
  display: "Aprender inglés de forma práctica",
  source: "derived",
  needs_confirmation: true,
  skipped: null,
};

function view(field: IntakeField = FIELD) {
  const handlers = {
    onConfirm: jest.fn(),
    onCorrect: jest.fn(() => Promise.resolve(true)),
    onAskAbout: jest.fn(),
    onLater: jest.fn(),
    onDeferAll: jest.fn(),
    onListen: jest.fn(),
  };
  render(<SetupReviewCard field={field} assistantName="Alba" saving={false} reviewed={3} total={11} {...handlers} />);
  return handlers;
}

describe("SetupReviewCard", () => {
  it("enseña el dato con su origen y cuánto va revisado", () => {
    view();
    expect(screen.getByText("Lo vi en su web. ¿Es así?")).toBeInTheDocument();
    expect(screen.getByText("Por qué les compran")).toBeInTheDocument();
    expect(screen.getByText("Lo vi en su web")).toBeInTheDocument();
    expect(screen.getByText("3 de 11 revisados")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Revisados" })).toHaveAttribute("aria-valuenow", "3");
  });

  it("«Así es» y «Después» con texto visible, cada uno con su efecto", () => {
    const { onConfirm, onLater } = view();
    fireEvent.click(screen.getByRole("button", { name: "Así es" }));
    expect(onConfirm).toHaveBeenCalledWith(FIELD);
    fireEvent.click(screen.getByRole("button", { name: "Después" }));
    expect(onLater).toHaveBeenCalledWith(FIELD);
  });

  it("«Corregir» edita AQUÍ MISMO y guarda el valor nuevo", async () => {
    const { onCorrect } = view();
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    const box = screen.getByRole("textbox");
    fireEvent.change(box, { target: { value: "Inglés y canto, de forma práctica" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => {
      expect(onCorrect).toHaveBeenCalledWith(FIELD, "Inglés y canto, de forma práctica");
    });
  });

  it("un dato que no se edita en una línea (un horario) se corrige hablando", () => {
    const { onAskAbout } = view({ ...FIELD, kind: "weekly_hours" });
    fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
    expect(onAskAbout).toHaveBeenCalled();
  });

  it("lo propuesto por el tipo de negocio no dice que salió de la web", () => {
    view({ ...FIELD, source: "proposed" });
    expect(screen.getByText("Lo propuse por tu tipo de negocio. ¿Te sirve?")).toBeInTheDocument();
    expect(screen.queryByText("Lo vi en su web")).not.toBeInTheDocument();
  });

  it("«Revisar el resto después» aparta todas las tarjetas", () => {
    const { onDeferAll } = view();
    fireEvent.click(screen.getByRole("button", { name: "Revisar el resto después" }));
    expect(onDeferAll).toHaveBeenCalled();
  });
});

describe("SetupReviewDone", () => {
  it("la tarjeta resuelta dice cómo quedó", () => {
    render(
      <SetupReviewDone
        assistantName="Alba"
        entry={{ code: "a", label: "Horario", display: "Lunes a sábado", outcome: "confirmed" }}
      />,
    );
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Horario")).toBeInTheDocument();
  });

  it("lo dejado para después avisa de que vuelve en la revisión final", () => {
    render(<SetupReviewDone assistantName="Alba" entry={{ code: "a", label: "Tono", display: "x", outcome: "later" }} />);
    expect(screen.getByText("Para después")).toBeInTheDocument();
    expect(screen.getByText(/te lo muestro en la revisión final/)).toBeInTheDocument();
  });
});
