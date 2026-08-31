import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { LayoutGrid, List } from "lucide-react";

import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";

/**
 * Lo que blindan estos tests es la SEMÁNTICA, que es la razón de existir del
 * componente: las once copias que sustituye declaraban `role="tab"` sin
 * `tabpanel`, y ninguna tenía navegación por flechas.
 */

type View = "board" | "table" | "calendar";

const ITEMS: readonly SegmentedItem<View>[] = [
  { value: "board", label: "Tablero", icon: LayoutGrid },
  { value: "table", label: "Tabla", icon: List, count: 12 },
  { value: "calendar", label: "Calendario" },
];

function Harness({ initial = "board" as View }: { initial?: View }) {
  const [value, setValue] = useState<View>(initial);
  return (
    <SegmentedControl
      value={value}
      onValueChange={setValue}
      items={ITEMS}
      label="Vista de pedidos"
    />
  );
}

describe("SegmentedControl", () => {
  it("es un radiogroup, no una lista de pestañas sin panel", () => {
    render(<Harness />);

    expect(screen.getByRole("radiogroup", { name: "Vista de pedidos" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    // El fallo que arregla: `role="tab"` prometía un `tabpanel` inexistente.
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("marca el activo con aria-checked y deja una sola parada de tabulación", () => {
    render(<Harness />);

    const [board, table] = screen.getAllByRole("radio");
    expect(board).toHaveAttribute("aria-checked", "true");
    expect(table).toHaveAttribute("aria-checked", "false");
    // Roving tabindex: el grupo entero es UN tab stop.
    expect(board).toHaveAttribute("tabindex", "0");
    expect(table).toHaveAttribute("tabindex", "-1");
  });

  it("cambia de opción con las flechas, en círculo", () => {
    render(<Harness />);

    fireEvent.keyDown(screen.getByRole("radio", { name: /Tablero/ }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /Tabla/ })).toHaveAttribute("aria-checked", "true");

    fireEvent.keyDown(screen.getByRole("radio", { name: /Tabla/ }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /Calendario/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    // Desde el último se vuelve al primero.
    fireEvent.keyDown(screen.getByRole("radio", { name: /Calendario/ }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /Tablero/ })).toHaveAttribute("aria-checked", "true");
  });

  it("retrocede con la flecha izquierda", () => {
    render(<Harness initial="table" />);

    fireEvent.keyDown(screen.getByRole("radio", { name: /Tabla/ }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: /Tablero/ })).toHaveAttribute("aria-checked", "true");
  });

  it("salta al primero y al último con Home y End", () => {
    render(<Harness initial="table" />);

    fireEvent.keyDown(screen.getByRole("radio", { name: /Tabla/ }), { key: "End" });
    expect(screen.getByRole("radio", { name: /Calendario/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    fireEvent.keyDown(screen.getByRole("radio", { name: /Calendario/ }), { key: "Home" });
    expect(screen.getByRole("radio", { name: /Tablero/ })).toHaveAttribute("aria-checked", "true");
  });

  it("cambia de opción con el ratón", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("radio", { name: /Calendario/ }));
    expect(screen.getByRole("radio", { name: /Calendario/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it('con labels="active" la etiqueta oculta sigue siendo accesible', () => {
    render(
      <SegmentedControl
        value="board"
        onValueChange={() => {}}
        items={ITEMS}
        label="Vista"
        labels="active"
      />,
    );

    // Se colapsa la CAJA (max-width 0), no la información: el nombre accesible
    // del radio inactivo sigue siendo su etiqueta.
    expect(screen.getByRole("radio", { name: /Tabla/ })).toBeInTheDocument();
  });

  it("pinta el contador solo cuando el ítem lo trae", () => {
    render(<Harness />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Tablero/ })).not.toHaveTextContent("12");
  });

  it("no deja seleccionar una opción deshabilitada", () => {
    const onValueChange = jest.fn();
    render(
      <SegmentedControl
        value="board"
        onValueChange={onValueChange}
        items={[
          { value: "board", label: "Tablero" },
          { value: "table", label: "Tabla", disabled: true },
        ]}
        label="Vista"
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Tabla" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("la flecha salta por encima de las opciones deshabilitadas", () => {
    const onValueChange = jest.fn();
    render(
      <SegmentedControl
        value="board"
        onValueChange={onValueChange}
        items={[
          { value: "board", label: "Tablero" },
          { value: "table", label: "Tabla", disabled: true },
          { value: "calendar", label: "Calendario" },
        ]}
        label="Vista"
      />,
    );

    fireEvent.keyDown(screen.getByRole("radio", { name: "Tablero" }), { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenCalledWith("calendar");
  });

  /**
   * El tratamiento del activo es una VARIANTE, no una copia.
   *
   * Dentro de un panel de filtros el dueño pidió que «seleccionado» se diga con
   * elevación y no con relleno de color, y la alternativa a esta prop era una
   * 24ª implementación a mano del segmentado solo para cambiarle el fondo. Lo
   * que estos dos tests protegen es que el default siga siendo `bg-accent`: son
   * 25 pestañas del panel las que dependen de él.
   */
  it("por defecto el activo va en `bg-accent`, como las 25 pestañas del panel", () => {
    const { container } = render(
      <SegmentedControl
        value="board"
        onValueChange={() => undefined}
        items={[{ value: "board", label: "Tablero" }]}
        label="Vista"
      />,
    );
    const pill = container.querySelector('[data-slot="segmented-pill"]');
    expect(pill).toHaveClass("bg-accent");
  });

  it("con `treatment=\"lift\"` el activo se ELEVA en vez de teñirse", () => {
    const { container } = render(
      <SegmentedControl
        value="board"
        onValueChange={() => undefined}
        items={[{ value: "board", label: "Tablero" }]}
        label="Vista"
        treatment="lift"
      />,
    );
    const pill = container.querySelector('[data-slot="segmented-pill"]');
    expect(pill).toHaveClass("bg-background", "shadow-float");
    expect(pill).not.toHaveClass("bg-accent");
  });
});
