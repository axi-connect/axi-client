import { fireEvent, render, screen } from "@testing-library/react";

import { channelProvider } from "@/modules/channels/domain/channel-providers";
import { PrerequisitesChecklist } from "../PrerequisitesChecklist";

/**
 * El paso 2 es un dispositivo de UX, no de seguridad: nadie valida lo que el
 * usuario marca. Lo que se asserta es que el gate funciona y que **dice por qué**
 * está cerrado — un botón deshabilitado sin explicación es un callejón sin
 * salida, y es el defecto de accesibilidad más común en un wizard.
 */
describe("PrerequisitesChecklist", () => {
  const provider = channelProvider("whatsapp_cloud");

  function setup() {
    const onContinue = jest.fn();
    render(<PrerequisitesChecklist provider={provider} onContinue={onContinue} />);
    return { onContinue };
  }

  it("«Continuar» nace deshabilitado y explica cuántos puntos faltan", () => {
    setup();
    const button = screen.getByRole("button", { name: "Continuar" });

    expect(button).toBeDisabled();
    // El motivo viaja por aria-describedby, no solo por el color gris
    const hintId = button.getAttribute("aria-describedby");
    expect(hintId).not.toBeNull();
    expect(screen.getByText(`Faltan ${provider.prerequisites.length} puntos por confirmar.`)).toBeInTheDocument();
  });

  it("se habilita solo con TODAS las casillas marcadas", () => {
    const { onContinue } = setup();
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(provider.prerequisites.length);

    // Una menos que el total: el gate sigue cerrado
    boxes.slice(0, -1).forEach((box) => fireEvent.click(box));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();

    fireEvent.click(boxes[boxes.length - 1]);
    const button = screen.getByRole("button", { name: "Continuar" });
    expect(button).toBeEnabled();
    // Con el gate abierto ya no hay nada que explicar
    expect(button).not.toHaveAttribute("aria-describedby");

    fireEvent.click(button);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("desmarcar vuelve a cerrar el gate", () => {
    setup();
    const boxes = screen.getAllByRole("checkbox");
    boxes.forEach((box) => fireEvent.click(box));
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();

    fireEvent.click(boxes[0]);
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    expect(screen.getByText("Falta confirmar un punto para continuar.")).toBeInTheDocument();
  });

  it("usa casillas NATIVAS, no divs con onClick", () => {
    setup();
    // DESIGN-SYSTEM §10: la semántica no se rompe. Un `div onClick` no aparece
    // como checkbox para un lector de pantalla ni responde a la barra espaciadora.
    screen.getAllByRole("checkbox").forEach((box) => {
      expect(box.tagName).toBe("INPUT");
      expect(box).toHaveAttribute("type", "checkbox");
    });
  });

  it("el requisito irreversible avisa de la consecuencia, no solo de la condición", () => {
    setup();
    // Es el punto donde más altas se caen: el número deja de funcionar en el
    // celular y sus chats no se recuperan
    expect(screen.getByText(/deja de funcionar en el celular/i)).toBeInTheDocument();
  });

  it("la salida lateral ofrece alternativas en vez de dejar al usuario atascado", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Algo de esto no lo cumplo" }));

    expect(screen.getByText(/El número ya está en WhatsApp:/)).toBeInTheDocument();
    expect(screen.getByText(/conecta un número nuevo o secundario/i)).toBeInTheDocument();
  });
});
