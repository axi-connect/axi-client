import { fireEvent, render, screen } from "@testing-library/react";

import type { IntakeProgress } from "@/modules/intake/domain/intake";
import { SetupProgress, SetupTopicList } from "../components/SetupProgress";

/**
 * El avance principal es el de lo ESENCIAL confirmado de verdad (informe de la
 * entrevista, rec. 9), y cada tema dice su estado en palabras con su nombre
 * entero (rec. 10, 12 y 13).
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
      title: "Lo que el asistente NO debe hacer nunca con un cliente",
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
  essential: { confirmed: 2, total: 5, complete: false },
  pending_review: 1,
  next_ask: { topic: "atencion", field: "horario" },
};

describe("SetupProgress", () => {
  it("un solo contador: lo esencial confirmado, con su barra accesible", () => {
    render(<SetupProgress progress={PROGRESS} counts={{ review: 1, undefined: 0, notApplicable: 0 }} />);
    expect(screen.getByText("2 de 5")).toBeInTheDocument();
    expect(screen.getByText(/datos esenciales confirmados/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Datos esenciales confirmados" })).toHaveAttribute(
      "aria-valuenow",
      "2",
    );
  });

  it("lo por revisar, por definir y lo que no aplica van aparte y con palabras", () => {
    render(<SetupProgress progress={PROGRESS} counts={{ review: 3, undefined: 1, notApplicable: 2 }} />);
    expect(screen.getByText("3 por revisar")).toBeInTheDocument();
    expect(screen.getByText("1 por definir")).toBeInTheDocument();
    expect(screen.getByText("2 no aplican")).toBeInTheDocument();
  });
});

describe("SetupTopicList", () => {
  it("cada tema dice su estado en palabras, y ya no hay «Luego»", () => {
    render(<SetupTopicList progress={PROGRESS} onResume={jest.fn()} />);
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
    expect(screen.getByText("Sin empezar")).toBeInTheDocument();
    expect(screen.getByText("Pospuesto · lo retomamos al final")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Luego" })).toBeNull();
  });

  it("el nombre del tema no se corta con puntos suspensivos: dos líneas", () => {
    render(<SetupTopicList progress={PROGRESS} onResume={jest.fn()} />);
    const title = screen.getByText("Lo que el asistente NO debe hacer nunca con un cliente");
    expect(title).toHaveClass("line-clamp-2");
    expect(title).not.toHaveClass("truncate");
  });

  it("un pospuesto se puede retomar", () => {
    const onResume = jest.fn();
    render(<SetupTopicList progress={PROGRESS} onResume={onResume} />);
    fireEvent.click(screen.getByRole("button", { name: "Retomar" }));
    expect(onResume).toHaveBeenCalledWith("venta");
  });
});
