import { fireEvent, render, screen } from "@testing-library/react";

import {
  PrerequisitesChecklist,
  type PrerequisiteChecklistItem,
} from "@/shared/components/prerequisites-checklist";

/**
 * La checklist compartida (F8) es un dispositivo de UX, no de seguridad: nadie
 * valida lo que el usuario marca. Se asserta que el gate funciona, que DICE por
 * qué está cerrado, y que la salida lateral solo aparece cuando el módulo
 * aporta contenido de ayuda.
 */
const ITEMS: readonly PrerequisiteChecklistItem[] = [
  { id: "uno", label: "Primer requisito", detail: "Detalle del primero." },
  {
    id: "dos",
    label: "Requisito irreversible",
    detail: "Esta consecuencia no se puede deshacer.",
    critical: true,
  },
  { id: "tres", label: "Tercer requisito", detail: "Detalle del tercero." },
];

describe("PrerequisitesChecklist (compartida)", () => {
  it("«Continuar» nace deshabilitado y explica cuántos puntos faltan", () => {
    render(<PrerequisitesChecklist providerLabel="Acme" items={ITEMS} onContinue={jest.fn()} />);
    const button = screen.getByRole("button", { name: "Continuar" });

    expect(button).toBeDisabled();
    // El motivo viaja por aria-describedby, no solo por el color gris
    expect(button.getAttribute("aria-describedby")).not.toBeNull();
    expect(screen.getByText("Faltan 3 puntos por confirmar.")).toBeInTheDocument();
  });

  it("se habilita solo con TODAS las casillas nativas marcadas", () => {
    const onContinue = jest.fn();
    render(<PrerequisitesChecklist providerLabel="Acme" items={ITEMS} onContinue={onContinue} />);

    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(ITEMS.length);
    boxes.forEach((box) => {
      expect(box.tagName).toBe("INPUT");
      expect(box).toHaveAttribute("type", "checkbox");
    });

    boxes.slice(0, -1).forEach((box) => fireEvent.click(box));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.getByText("Falta confirmar un punto para continuar.")).toBeInTheDocument();

    fireEvent.click(boxes[boxes.length - 1]);
    const button = screen.getByRole("button", { name: "Continuar" });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-describedby");

    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("el ítem crítico se pinta como aviso destacado", () => {
    render(<PrerequisitesChecklist providerLabel="Acme" items={ITEMS} onContinue={jest.fn()} />);
    expect(screen.getByText("Esta consecuencia no se puede deshacer.")).toBeInTheDocument();
  });

  it("sin contenido de ayuda NO hay salida lateral (integraciones queda idéntica)", () => {
    render(<PrerequisitesChecklist providerLabel="Acme" items={ITEMS} onContinue={jest.fn()} />);
    expect(
      screen.queryByRole("button", { name: "Algo de esto no lo cumplo" }),
    ).not.toBeInTheDocument();
  });

  it("con supportMessage la salida lateral ofrece el soporte por WhatsApp", () => {
    render(
      <PrerequisitesChecklist
        providerLabel="Acme"
        items={ITEMS}
        onContinue={jest.fn()}
        supportMessage="Hola, tengo dudas con Acme."
        helpContent={<p>Alternativas del módulo.</p>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Algo de esto no lo cumplo" }));
    expect(screen.getByText("Alternativas del módulo.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /Hablar con soporte por WhatsApp/i });
    expect(link.getAttribute("href")).toContain(encodeURIComponent("Hola, tengo dudas con Acme."));
  });
});
