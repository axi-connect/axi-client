import { fireEvent, render, screen, within } from "@testing-library/react";

import type { IntakeField, IntakeProgress, IntakeTopicView } from "@/modules/intake/domain/intake";
import { SetupReview } from "../components/SetupReview";

/** La revisión final ANTES de enviar (informe, rec. 15): lo pendiente arriba y el botón que nombra su efecto. */

const base: IntakeField = {
  code: "x",
  label: "X",
  kind: "text",
  required: true,
  help: null,
  options: null,
  value: "v",
  display: "v",
  source: "stated",
  needs_confirmation: false,
  skipped: null,
};

const TOPICS: IntakeTopicView[] = [
  {
    code: "negocio",
    title: "Tu negocio",
    fields: [
      { ...base, code: "que_venden", label: "Qué venden", display: "Cursos" },
      { ...base, code: "tono", label: "Tono", display: "Cálido", source: "proposed", needs_confirmation: true },
      { ...base, code: "vacio", label: "Vacío", value: null, display: null },
    ],
  },
];

const PROGRESS: IntakeProgress = {
  topics: [],
  percent: 50,
  next_topic: null,
  next_field: null,
  has_pending_required: false,
  has_pending_confirmation: true,
  essential: { confirmed: 1, total: 2, complete: true },
  pending_review: 1,
  next_ask: null,
};

function view(over: Partial<Parameters<typeof SetupReview>[0]> = {}) {
  const onFinish = jest.fn();
  const onBack = jest.fn();
  render(
    <SetupReview
      topics={TOPICS}
      progress={PROGRESS}
      savingField={null}
      finishing={false}
      finishError={null}
      onSave={jest.fn(() => Promise.resolve(true))}
      onConfirm={jest.fn()}
      onAskAbout={jest.fn()}
      onSkip={jest.fn()}
      onUnskip={jest.fn()}
      onBack={onBack}
      onFinish={onFinish}
      {...over}
    />,
  );
  return { onFinish, onBack };
}

describe("SetupReview", () => {
  it("lo pendiente va arriba, solo, y lo vacío no ocupa sitio", () => {
    view();
    const pending = screen.getByRole("region", { name: "Por revisar · 1" });
    expect(within(pending).getByText("Cálido")).toBeInTheDocument();
    const topic = screen.getByRole("region", { name: "Tu negocio" });
    expect(within(topic).getByText("Cursos")).toBeInTheDocument();
    expect(within(topic).queryByText("Cálido")).toBeNull();
    expect(screen.queryByText("Vacío")).toBeNull();
  });

  it("el botón nombra su efecto, y dice que lo pendiente no se aplica", () => {
    const { onFinish } = view();
    expect(screen.getByText(/Lo que esté por revisar no se aplica/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Enviar a revisión" }));
    expect(onFinish).toHaveBeenCalled();
  });

  it("enviando se atenúa; si falla, el motivo va junto al botón", () => {
    view({ finishing: true, finishError: "No pudimos enviarlo." });
    expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(screen.getByText("No pudimos enviarlo.")).toBeInTheDocument();
  });

  it("se puede volver a la entrevista", () => {
    const { onBack } = view();
    fireEvent.click(screen.getByRole("button", { name: "Volver a la entrevista" }));
    expect(onBack).toHaveBeenCalled();
  });
});
