import { fireEvent, render, screen } from "@testing-library/react";

import type { IntakeProgress, IntakeTopicView } from "@/modules/intake/domain/intake";
import { SetupSummary, pendingNotice } from "../components/SetupSummary";

/**
 * Terminada la conversación, la ficha se RELEE: el servidor rechaza cualquier
 * escritura sobre una sesión cerrada (409 `intake/session_closed`), así que
 * ofrecer «Así es», la edición o «Luego» solo produciría un «No se pudo
 * guardar» delante de alguien que acaba de dedicarle siete minutos a esto.
 */

const TOPICS: IntakeTopicView[] = [
  {
    code: "negocio",
    title: "Tu negocio",
    fields: [
      {
        code: "ciudad",
        label: "Ciudad",
        kind: "text",
        required: false,
        help: null,
        options: null,
        value: "Bogotá",
        display: "Bogotá",
        source: "stated",
        needs_confirmation: false,
        skipped: null,
      },
      {
        code: "sector",
        label: "Sector",
        kind: "text",
        required: false,
        help: null,
        options: null,
        value: "Ropa deportiva",
        display: "Ropa deportiva",
        source: "derived",
        needs_confirmation: true,
        skipped: null,
      },
    ],
  },
];

const PROGRESS: IntakeProgress = {
  topics: [
    {
      code: "negocio",
      title: "Tu negocio",
      required: 1,
      resolved: 1,
      pending_confirmation: 1,
      captured: 2,
      answered: 0,
      skipped: 0,
      open: 0,
      total: 2,
      deferred: false,
      status: "in_progress",
    },
  ],
  percent: 50,
  next_topic: "negocio",
  next_field: null,
  has_pending_required: false,
  has_pending_confirmation: true,
};

function view(readOnly: boolean) {
  const onSave = jest.fn(() => Promise.resolve(true));
  const onConfirm = jest.fn();
  const onAskAbout = jest.fn();
  const onDefer = jest.fn();
  render(
    <SetupSummary
      topics={TOPICS}
      progress={PROGRESS}
      savingField={null}
      onSave={onSave}
      onConfirm={onConfirm}
      onAskAbout={onAskAbout}
      onSkip={jest.fn()}
      onUnskip={jest.fn()}
      onDefer={onDefer}
      onResume={jest.fn()}
      readOnly={readOnly}
    />,
  );
  return { onSave, onConfirm, onAskAbout, onDefer };
}

describe("SetupSummary", () => {
  it("en curso: se corrige, se confirma y se aplaza", () => {
    const { onConfirm } = view(false);
    expect(screen.getByRole("button", { name: "Corregir Ciudad" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Así es" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Luego" })).toBeInTheDocument();
    expect(screen.getByText(/toca cualquiera para corregirlo/)).toBeInTheDocument();
    expect(screen.getByText(/lo saqué de su página web/)).toBeInTheDocument();
  });

  it("terminada: los datos se leen, sin corregir, confirmar ni aplazar", () => {
    view(true);
    expect(screen.getByText("Bogotá")).toBeInTheDocument();
    expect(screen.getByText("Ropa deportiva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Corregir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Así es" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Luego" })).not.toBeInTheDocument();
    expect(screen.getByText(/la conversación ya terminó/)).toBeInTheDocument();
    // Una deducción que ya no se puede confirmar no se anuncia como pendiente.
    expect(screen.queryByText(/falta que lo confirmes/)).not.toBeInTheDocument();
  });
});

/** N6: lo propuesto por el nicho no salió de ninguna web, y el aviso no puede decirlo. */
describe("pendingNotice", () => {
  it("separa lo deducido de la web de lo propuesto por el tipo de negocio", () => {
    expect(pendingNotice(1, 0)).toBe("Un dato lo saqué de su página web y falta que lo confirmes.");
    expect(pendingNotice(0, 3)).toBe("3 datos los propuse por tu tipo de negocio y falta que los revises.");
    expect(pendingNotice(2, 1)).toBe(
      "2 datos los saqué de su página web y falta que los confirmes. Un dato lo propuse por tu tipo de negocio y falta que lo revises.",
    );
    expect(pendingNotice(0, 0)).toBe("");
  });
});
