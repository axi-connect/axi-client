import { render, screen } from "@testing-library/react";

import { AssistantChatShell } from "../AssistantChatShell";

/**
 * Las invariantes de layout del despacho, ahora en el kit: la raíz marca
 * `data-empty`, el compositor es EL MISMO nodo antes y después del primer
 * mensaje (conserva foco y placeholder tecleado), y lo que cuelga del
 * compositor viene después del formulario en el DOM.
 */

function shell(empty: boolean, children?: React.ReactNode) {
  return (
    <AssistantChatShell
      empty={empty}
      dock={<header data-testid="dock">dock</header>}
      actions={<button type="button">acción</button>}
      hero={<h1>saludo</h1>}
      composer={
        <>
          <form aria-label="compositor">
            <textarea aria-label="campo" />
          </form>
          <div data-testid="after">píldoras</div>
        </>
      }
      autoScrollDeps={[empty]}
    >
      {children}
    </AssistantChatShell>
  );
}

describe("AssistantChatShell", () => {
  it("vacío lleva data-empty; con conversación lo pierde", () => {
    const { container, rerender } = render(shell(true));
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-empty");
    rerender(shell(false, <p>hola</p>));
    expect(root).not.toHaveAttribute("data-empty");
  });

  it("el formulario del compositor NO se remonta al pasar de vacío a conversación", () => {
    const { rerender } = render(shell(true));
    const form = screen.getByRole("form", { name: "compositor" });
    const field = screen.getByLabelText("campo");
    field.focus();
    rerender(shell(false, <p>hola</p>));
    expect(screen.getByRole("form", { name: "compositor" })).toBe(form);
    expect(document.activeElement).toBe(field);
  });

  it("orden del DOM: acciones, dock, saludo, hilo, y las píldoras después del formulario", () => {
    render(shell(false, <p data-testid="thread">hilo</p>));
    const order = [
      screen.getByRole("button", { name: "acción" }),
      screen.getByTestId("dock"),
      screen.getByRole("heading", { name: "saludo" }),
      screen.getByTestId("thread"),
      screen.getByRole("form", { name: "compositor" }),
      screen.getByTestId("after"),
    ];
    for (let index = 1; index < order.length; index += 1) {
      expect(
        order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("sin dock no hay reserva ni centinela (asistente bloqueado)", () => {
    const { container } = render(
      <AssistantChatShell empty={false} composer={<form aria-label="compositor" />} autoScrollDeps={[]}>
        <p>dormido</p>
      </AssistantChatShell>,
    );
    expect(container.querySelector(".assistant-hero-spacer")).toBeNull();
    expect(screen.getByText("dormido")).toBeInTheDocument();
  });
});
