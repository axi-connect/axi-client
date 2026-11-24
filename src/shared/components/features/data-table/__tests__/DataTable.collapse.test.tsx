import { fireEvent, render, screen } from "@testing-library/react";

import DataTable, { type ColumnDef, type DataRow } from "../index";

/**
 * Cómo se llega a las columnas que no caben.
 *
 * El modo de siempre pinta un renglón «Ver más» bajo CADA fila: en una tabla de
 * 25 leads son 25 renglones iguales y el alto se dobla. `collapseMode="icon"`
 * lo cambia por un botón al final de la fila. Es opcional: las demás tablas
 * siguen como estaban, y el primer test es el que lo garantiza.
 */

type Row = DataRow & { id: string; name: string; city: string; origin: string };

const ROWS: Row[] = [
  { id: "a", name: "Hotel Boutique Casa Lumbre", city: "Bogotá", origin: "Google Maps" },
  { id: "b", name: "Café Aldea Verde", city: "Medellín", origin: "Google Maps" },
];

/** En jsdom `clientWidth` es 0: solo cabe lo `alwaysVisible`; el resto se pliega. */
const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Lead", alwaysVisible: true, minWidth: 200 },
  { accessorKey: "city", header: "Ciudad" },
  { accessorKey: "origin", header: "Origen" },
];

describe("DataTable — columnas que no caben", () => {
  it("POR DEFECTO sigue igual: un renglón «Ver más» bajo cada fila", () => {
    render(<DataTable<Row> data={ROWS} columns={COLUMNS} />);

    expect(screen.getAllByRole("button", { name: "Ver más" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Ver más datos" })).toBeNull();
  });

  it("`icon`: ningún renglón de más; un botón por fila, con nombre fijo", () => {
    render(<DataTable<Row> data={ROWS} columns={COLUMNS} collapseMode="icon" />);

    expect(screen.queryByRole("button", { name: "Ver más" })).toBeNull();
    const buttons = screen.getAllByRole("button", { name: "Ver más datos" });
    expect(buttons).toHaveLength(2);
    // Cerrado no apunta a ningún panel: todavía no existe.
    expect(buttons[0]).not.toHaveAttribute("aria-controls");
    // Una fila por lead, más la cabecera: nada debajo hasta que se pide.
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.queryByText("Bogotá")).toBeNull();
  });

  it("`icon`: el botón abre el detalle SOLO de su fila, y lo vuelve a cerrar", () => {
    render(<DataTable<Row> data={ROWS} columns={COLUMNS} collapseMode="icon" />);

    const [first] = screen.getAllByRole("button", { name: "Ver más datos" });
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);

    expect(screen.getByText("Bogotá")).toBeInTheDocument();
    expect(screen.queryByText("Medellín")).toBeNull();
    // El nombre no cambia; el estado lo dice `aria-expanded`, y ahora sí apunta al panel.
    expect(first).toHaveAccessibleName("Ver más datos");
    expect(first).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(first.getAttribute("aria-controls") ?? "")).not.toBeNull();

    fireEvent.click(first);
    expect(screen.queryByText("Bogotá")).toBeNull();
    expect(first).not.toHaveAttribute("aria-controls");
  });

  it("`icon`: si todo cabe no hay botón ni columna de más", () => {
    const all = COLUMNS.map((column) => ({ ...column, alwaysVisible: true }));
    render(<DataTable<Row> data={ROWS} columns={all} collapseMode="icon" />);

    expect(screen.queryByRole("button", { name: /Ver más/ })).toBeNull();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.getByText("Bogotá")).toBeInTheDocument();
  });
});
