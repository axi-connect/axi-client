import { fireEvent, render, screen } from "@testing-library/react";

import type { IntakeProgress } from "@/modules/intake/domain/intake";
import { SetupProgress, SetupTopicList } from "../components/SetupProgress";

/**
 * El progreso se cuenta POR TEMA y los aplazados salen del denominador. Si
 * contaran, la barra nunca llegaría al final y la persona cargaría para siempre
 * con una deuda que ya decidió no pagar.
 */

const PROGRESS: IntakeProgress = {
  topics: [
    {
      code: "negocio",
      title: "Tu negocio",
      required: 1,
      resolved: 1,
      pending_confirmation: 0,
      captured: 2,
      answered: 0,
      skipped: 0,
      open: 0,
      total: 2,
      deferred: false,
      status: "done",
    },
    {
      code: "atencion",
      title: "Cuándo atienden",
      required: 1,
      resolved: 0,
      pending_confirmation: 0,
      captured: 0,
      answered: 0,
      skipped: 0,
      open: 0,
      total: 1,
      deferred: false,
      status: "pending",
    },
    {
      code: "venta",
      title: "Cómo cierran",
      required: 1,
      resolved: 0,
      pending_confirmation: 0,
      captured: 0,
      answered: 0,
      skipped: 0,
      open: 0,
      total: 1,
      deferred: true,
      status: "deferred",
    },
  ],
  percent: 50,
  next_topic: "atencion",
  next_field: null,
  has_pending_required: true,
  has_pending_confirmation: false,
};

describe("SetupProgress", () => {
  it("cuenta los temas SIN los aplazados", () => {
    render(<SetupProgress progress={PROGRESS} />);
    expect(screen.getByText("1 de 2 temas")).toBeInTheDocument();
  });

  /**
   * Con un solo tema pendiente gana «Queda uno» sobre cualquier porcentaje: es
   * más concreto y más corto, que es lo que se lee de reojo en un móvil.
   */
  it("habla en palabras, no en porcentajes", () => {
    render(<SetupProgress progress={PROGRESS} />);
    expect(screen.getByText("Queda uno")).toBeInTheDocument();
    expect(screen.queryByText("50%")).toBeNull();
  });
});

describe("SetupTopicList", () => {
  /**
   * Que aplazar sea un botón a la vista, y no algo que haya que pedir hablando,
   * es el permiso explícito para no saber algo.
   */
  it("ofrece aplazar lo que sigue abierto", () => {
    const onDefer = jest.fn();
    render(<SetupTopicList progress={PROGRESS} onDefer={onDefer} onResume={jest.fn()} />);

    const buttons = screen.getAllByRole("button", { name: "Luego" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]!);
    expect(onDefer).toHaveBeenCalledWith("atencion");
  });

  it("un tema ya cerrado no ofrece aplazarse", () => {
    render(<SetupTopicList progress={PROGRESS} onDefer={jest.fn()} onResume={jest.fn()} />);
    expect(screen.getByText("Tu negocio")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Luego" })).toHaveLength(1);
  });

  it("un aplazado se puede retomar", () => {
    const onResume = jest.fn();
    render(<SetupTopicList progress={PROGRESS} onDefer={jest.fn()} onResume={onResume} />);
    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(onResume).toHaveBeenCalledWith("venta");
  });
});
