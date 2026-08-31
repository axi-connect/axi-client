import { fireEvent, render, screen } from "@testing-library/react";

import { Modal } from "../modal";

/**
 * Lo que blinda este fichero es un defecto que el dueño encontró usando el
 * módulo: pulsaba «Sí, eliminar», los leads se borraban, salía el aviso «24
 * leads eliminados»… y el diálogo seguía en pantalla.
 *
 * No era de la bandeja: `Modal` solo cerraba si la acción llevaba `asClose`, y
 * había trece confirmaciones en el panel que pasaban solo `onClick` —borrar
 * contactos, etiquetas, segmentos, embudos, reglas, canales, leads—. Cada una lo
 * tapaba a su manera, con un `closeModal()` a mano, o no lo tapaba.
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

  it("`asClose` sigue aceptándose y ya no cambia nada", () => {
    // Catorce llamadas lo pasan —unas en `true`, otras en `false` junto a un
    // `onClick`— y quitarlo sería tocar catorce ficheros para no cambiar ninguna
    // conducta. Lo que NO puede pasar es que `asClose: false` vuelva a dejar una
    // confirmación abierta.
    const onOpenChange = jest.fn();
    render(
      <Modal
        open
        onOpenChange={onOpenChange}
        config={{ actions: [{ label: "Eliminar", asClose: false, onClick: () => undefined }] }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
