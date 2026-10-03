import { fireEvent, render, screen, within } from "@testing-library/react";

import { countPassing, StepProgress, StepTramos, type StepProgressCheck } from "../StepProgress";

function checks(onGo = jest.fn()): StepProgressCheck[] {
  return [
    { id: "offer", label: "La oferta", state: "ready", onGo: () => onGo("offer") },
    { id: "trial", label: "La prueba", state: "warning", onGo: () => onGo("trial") },
    { id: "mail", label: "El correo", state: "pending", onGo: () => onGo("mail") },
  ];
}

describe("StepProgress", () => {
  it("el título, el contador de tramos que pasan (listos o con aviso) y qué falta", () => {
    render(<StepProgress title="Casi lista" checks={checks()} detail="Falta el dueño" />);
    expect(screen.getByText("Casi lista")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("Falta el dueño")).toBeInTheDocument();
  });

  it("un botón por tramo, con su estado dicho en `sr-only`", () => {
    render(<StepProgress title="Casi lista" checks={checks()} detail="—" />);
    const list = screen.getByRole("list", { name: "Qué falta" });
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(3);
    expect(within(list).getByRole("button", { name: "La oferta: listo" })).toHaveAttribute("title", "La oferta");
    expect(within(list).getByRole("button", { name: "La prueba: con un aviso" })).toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "El correo: por resolver" })).toBeInTheDocument();
    expect(screen.getByText(": por resolver", { exact: false })).toHaveClass("sr-only");
  });

  it("cada tramo lleva a su paso", () => {
    const onGo = jest.fn();
    render(<StepProgress title="Casi lista" checks={checks(onGo)} detail="—" />);
    fireEvent.click(screen.getByRole("button", { name: "La prueba: con un aviso" }));
    expect(onGo).toHaveBeenCalledWith("trial");
    fireEvent.click(screen.getByRole("button", { name: "El correo: por resolver" }));
    expect(onGo).toHaveBeenLastCalledWith("mail");
  });

  it("el tramo es un objetivo de 24 px con la barra de 6 px dentro, en el tono de su estado", () => {
    render(<StepProgress title="Casi lista" checks={checks()} detail="—" label="Qué le falta" />);
    const button = screen.getByRole("button", { name: "La prueba: con un aviso" });
    expect(button).toHaveClass("h-6");
    const bar = button.querySelector("[aria-hidden='true']");
    expect(bar).toHaveClass("h-1.5", "bg-warning");
    expect(screen.getByRole("button", { name: "La oferta: listo" }).querySelector("[aria-hidden='true']")).toHaveClass("bg-current");
    expect(screen.getByRole("button", { name: "El correo: por resolver" }).querySelector("[aria-hidden='true']")).toHaveClass("bg-current/20");
    expect(screen.getByRole("list", { name: "Qué le falta" })).toBeInTheDocument();
  });

  it("`blocked` se pinta como el aviso pero NO cuenta: hay algo que corregir", () => {
    render(
      <StepProgress
        title="Casi lista"
        detail="Falta el ejemplo de {{2}}"
        checks={[
          { id: "purpose", label: "¿Para qué es?", state: "ready", onGo: jest.fn() },
          { id: "message", label: "El mensaje", state: "blocked", onGo: jest.fn() },
          { id: "ficha", label: "Ficha", state: "ready", onGo: jest.fn() },
        ]}
      />,
    );
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "El mensaje: por corregir" })).toBeInTheDocument();
  });
});

describe("StepTramos y countPassing", () => {
  it("solo los tramos, con la misma lista accesible, para una isla que pone el estado en otro sitio", () => {
    const onGo = jest.fn();
    render(<StepTramos checks={checks(onGo)} />);
    const list = screen.getByRole("list", { name: "Qué falta" });
    expect(within(list).getAllByRole("button")).toHaveLength(3);
    fireEvent.click(within(list).getByRole("button", { name: "El correo: por resolver" }));
    expect(onGo).toHaveBeenCalledWith("mail");
    // Sin título ni detalle: eso lo pone quien la usa.
    expect(screen.queryByText("2/3")).not.toBeInTheDocument();
  });

  it("cuenta los listos y los con aviso, no los por corregir ni los por resolver", () => {
    expect(countPassing(checks())).toBe(2);
    expect(countPassing([{ id: "x", label: "X", state: "blocked", onGo: jest.fn() }])).toBe(0);
  });
});
