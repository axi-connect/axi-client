import { fireEvent, render, screen } from "@testing-library/react";

import { SetupListEditor } from "../components/SetupListEditor";

/**
 * Lo que defiende esta suite es la razón de ser del control: que corregir una
 * propuesta cueste un toque y no una reescritura.
 *
 * Y una regla que no se ve en la pantalla: si la lista queda igual que la
 * propuesta, «Listo» NO manda un guardado — devuelve `null` y quien lo usa la
 * confirma. Escribir en el tenant algo que ya vale lo mismo es ruido en el
 * recibo que después nadie sabe interpretar.
 */
function setup(items: string[] = ["Consulta", "Cotización", "Pago"]) {
  const onDone = jest.fn();
  const onCancel = jest.fn();
  render(
    <ul>
      <SetupListEditor
        label="Pasos de una venta"
        items={items}
        saving={false}
        note="Solo se añade lo que falte."
        onCancel={onCancel}
        onDone={onDone}
      />
    </ul>,
  );
  return { onDone, onCancel };
}

describe("SetupListEditor", () => {
  it("pinta cada elemento como su propio campo, numerado", () => {
    setup();
    expect(screen.getByDisplayValue("Consulta")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cotización")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Pago")).toBeInTheDocument();
  });

  it("sin cambios devuelve `null`: hay que confirmar, no reescribir", () => {
    const { onDone } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledWith(null);
  });

  it("quitar un elemento devuelve la lista sin él", () => {
    const { onDone } = setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledWith(["Consulta", "Pago"]);
  });

  /** En un embudo el orden ES el recorrido de una venta, no una preferencia. */
  it("subir un elemento cambia el orden que se guarda", () => {
    const { onDone } = setup();
    fireEvent.click(screen.getAllByRole("button", { name: "Subir" })[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledWith(["Cotización", "Consulta", "Pago"]);
  });

  it("el primero no se puede subir y el último no se puede bajar", () => {
    setup();
    expect(screen.getAllByRole("button", { name: "Subir" })[0]).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Bajar" })[2]).toBeDisabled();
  });

  it("renombrar un elemento viaja en la lista", () => {
    const { onDone } = setup();
    fireEvent.change(screen.getByDisplayValue("Pago"), {
      target: { value: "Pago confirmado" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledWith(["Consulta", "Cotización", "Pago confirmado"]);
  });

  /** Un elemento añadido y dejado en blanco no se manda: no es una etapa. */
  it("descarta lo que se añadió y se dejó vacío", () => {
    const { onDone } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Añadir/ }));
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(onDone).toHaveBeenCalledWith(["Consulta", "Cotización", "Pago"]);
  });

  it("vaciar la lista entera deja «Listo» apagado", () => {
    setup(["Consulta"]);
    fireEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(screen.getByRole("button", { name: "Listo" })).toBeDisabled();
  });

  it("cancelar no guarda nada", () => {
    const { onDone, onCancel } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
