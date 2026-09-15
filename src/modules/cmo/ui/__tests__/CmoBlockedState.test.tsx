import { render, screen } from "@testing-library/react";

import { CmoBlockedState } from "../components/CmoBlockedState";

/**
 * Las dos pantallas de bloqueo son promesas de producto, no estados de error
 * genéricos. La de cuota carga la promesa central del diseño (D8): si no dice
 * que los agentes siguen atendiendo, el dueño asume lo contrario y llama
 * asustado. La auditoría encontró que nada las protegía.
 */
describe("CmoBlockedState", () => {
  it("cuota agotada: dice EXPLÍCITAMENTE que los agentes siguen atendiendo", () => {
    render(<CmoBlockedState blocker="quota" canManage />);
    expect(screen.getByText(/agotó sus análisis/iu)).toBeVisible();
    // La frase que quita la ansiedad. Es la promesa D8 hecha pantalla, en dos frases.
    expect(screen.getByText(/tus agentes siguen atendiendo/iu)).toBeVisible();
    // No hay interruptor que arregle una cuota: el botón lleva a ver los ajustes.
    expect(screen.getByRole("link", { name: /ver ajustes/iu })).toBeVisible();
  });

  it("apagado: el que puede encenderlo recibe el botón, no una explicación", () => {
    render(<CmoBlockedState blocker="disabled" canManage />);
    expect(screen.getByText(/Axel está apagado/iu)).toBeVisible();
    expect(screen.getByRole("link", { name: /encender a axel/iu })).toBeVisible();
  });

  it("sin permiso de aprobar NO se pinta un botón que daría 403: se dice a quién pedir", () => {
    render(<CmoBlockedState blocker="disabled" canManage={false} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/pídeselo a un administrador/iu)).toBeVisible();
  });
});
