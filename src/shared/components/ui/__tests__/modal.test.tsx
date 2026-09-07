import { fireEvent, render, screen } from "@testing-library/react";

import { Modal } from "../modal";

/**
 * Lo que blinda este fichero son dos defectos que el dueño encontró usando el
 * panel, y que son las dos caras de la misma decisión: ¿quién cierra el diálogo?
 *
 * 1. (2026-08-31) Pulsaba «Sí, eliminar», los leads se borraban, salía el aviso
 *    «24 leads eliminados»… y el diálogo seguía en pantalla. `Modal` solo cerraba
 *    si la acción llevaba `asClose`, y trece confirmaciones pasaban solo
 *    `onClick`. Desde entonces toda acción cierra por defecto.
 *
 * 2. (2026-09-07) Al arreglar lo anterior, `asClose: false` pasó a no hacer nada
 *    y toda acción «Guardar» que hace `requestSubmit()` sobre un formulario
 *    empezó a cerrar el diálogo con el formulario inválido; en las rutas
 *    interceptadas (`/admin/agents/@form/(.)create`) ese cierre hace
 *    `router.back()`, que se suma al `router.back()` del `onSuccess`, y el
 *    usuario aterrizaba dos páginas atrás, en la bandeja. Una acción que pidió no
 *    cerrar —`keepOpen: true` o su nombre anterior `asClose: false`— la cierra
 *    quien la pasó, nunca el `Modal`.
 */
describe("Modal · una acción confirma y CIERRA", () => {
  it("EL BUG: una acción con solo `onClick` cierra el diálogo", () => {
    const onOpenChange = jest.fn();
    const onClick = jest.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{
          title: "¿Eliminar 24 leads?",
          actions: [{ label: "Sí, eliminar 24", onClick }],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sí, eliminar 24" }));

    // Las dos cosas, y en este orden de importancia: el trabajo se hace…
    expect(onClick).toHaveBeenCalledTimes(1);
    // …y el diálogo se va.
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("`asClose: true` es el comportamiento por defecto: cierra", () => {
    const onOpenChange = jest.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{ actions: [{ label: "Cancelar", asClose: true }] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Modal · una acción que pidió no cerrar la cierra quien la pasó", () => {
  it("`keepOpen` es la excepción, y hay que pedirla", () => {
    const onOpenChange = jest.fn();
    const onClick = jest.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{ actions: [{ label: "Aplicar", onClick, keepOpen: true }] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("`asClose: false` es el nombre anterior de `keepOpen: true` y se sigue honrando", () => {
    // Treinta y nueve llamadas en treinta y cinco ficheros lo pasan y cada una
    // cierra por su cuenta (`closeModal()` tras el `await`, `onSuccess` del
    // formulario). Volverlo inerte fue lo que cerró los formularios inválidos.
    // Las trece confirmaciones atascadas de 2026-08-31 pasaban solo `onClick`:
    // no les afecta y siguen cerrando (test de arriba).
    const onOpenChange = jest.fn();
    const onClick = jest.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{ actions: [{ label: "Eliminar", asClose: false, onClick }] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("EL BUG 2026-09-07: «Guardar» con `requestSubmit()` y formulario inválido deja el diálogo abierto", () => {
    const onOpenChange = jest.fn();
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{
          title: "Crear agente",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            {
              label: "Guardar",
              keepOpen: true,
              onClick: () => (document.getElementById("agent-form") as HTMLFormElement | null)?.requestSubmit(),
            },
          ],
        }}
      >
        <form id="agent-form" onSubmit={onSubmit}>
          <input aria-label="Nombre" required defaultValue="" />
        </form>
      </Modal>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // `requestSubmit` respeta la validación nativa: con el campo vacío no hay submit…
    expect(onSubmit).not.toHaveBeenCalled();
    // …y el diálogo sigue ahí, con el formulario y su error a la vista.
    expect(onOpenChange).not.toHaveBeenCalled();
    // (jsdom no expone el `role="dialog"` de Radix por accesibilidad; el título sí.)
    expect(screen.getByRole("heading", { name: "Crear agente" })).toBeInTheDocument();
  });
});
