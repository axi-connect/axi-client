import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import DataTable, { type ColumnDef, type DataRow } from "../index";

/**
 * Lo que blindan estos tests son las tres deudas que F5 pagó en el `DataTable`,
 * y las tres se manifestaban SIN ERROR:
 *
 * 1. **La caja de búsqueda inerte.** Se pintaba sin condición, y sin
 *    `onSearchChange` no emite nada: nueve de las diecisiete tablas mostraban un
 *    campo en el que se podía escribir y no pasaba nada. El primer test es el
 *    que impide que vuelva.
 * 2. **La casilla en el sitio equivocado.** `useResponsiveColumns` reordena, así
 *    que la casilla que el consumidor ponía primera se pintaba después de la
 *    columna de nombre, y a poco ancho se caía dentro del panel «Ver más».
 * 3. **La selección más allá de la página.** Marcar la cabecera no puede
 *    seleccionar lo que el usuario no ha visto: promover escribe datos de
 *    terceros en el CRM y no se deshace.
 */

type Row = DataRow & { id: string; name: string; city: string };

const ROWS: Row[] = [
  { id: "a", name: "Kokoa & Co", city: "Bogotá" },
  { id: "b", name: "Kokoro Sushi", city: "Bogotá" },
  { id: "c", name: "Ferretería Ruiz", city: "Medellín" },
];

/** `alwaysVisible` porque en jsdom `clientWidth` es 0 y lo flexible no cabe. */
const NAME: ColumnDef<Row> = {
  accessorKey: "name",
  header: "Lead",
  alwaysVisible: true,
  minWidth: 200,
};
const ACTIONS: ColumnDef<Row> = {
  id: "actions",
  header: "",
  cell: () => <button type="button">Abrir</button>,
};

function Harness({
  isSelectable,
  allMatching,
}: {
  isSelectable?: (row: Row) => boolean;
  allMatching?: { count: number; limit?: number };
}) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [all, setAll] = useState(false);
  return (
    <DataTable<Row>
      data={ROWS}
      columns={[NAME, ACTIONS]}
      pagination={{ pageSize: 25, total: ROWS.length }}
      selection={{
        rowId: (row) => row.id,
        rowLabel: (row) => row.name,
        selected,
        onChange: setSelected,
        isSelectable,
        allMatching:
          allMatching === undefined
            ? undefined
            : {
                active: all,
                count: allMatching.count,
                limit: allMatching.limit,
                onSelectAll: () => setAll(true),
                onClear: () => setAll(false),
              },
        actions: ({ count }) => <button type="button">{`Promover ${count}`}</button>,
      }}
    />
  );
}

describe("DataTable · el buscador se declara, no se adivina", () => {
  it("SIN `onSearchChange` no pinta caja de búsqueda", () => {
    // El test que protege nueve pantallas de que vuelva la caja muerta.
    render(
      <DataTable<Row> data={ROWS} columns={[NAME]} pagination={{ pageSize: 25, total: 3 }} />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("CON `onSearchChange` sigue pintándola, igual que antes", () => {
    // Y este protege a las ocho que sí la usan de que se la quitemos.
    render(
      <DataTable<Row>
        data={ROWS}
        columns={[NAME]}
        pagination={{ pageSize: 25, total: 3 }}
        onSearchChange={() => undefined}
      />,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("`searchMode=\"none\"` la esconde aunque haya manejador", () => {
    render(
      <DataTable<Row>
        data={ROWS}
        columns={[NAME]}
        pagination={{ pageSize: 25, total: 3 }}
        searchMode="none"
        onSearchChange={() => undefined}
      />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("con un solo campo buscable no ofrece el selector de campo", () => {
    // Un desplegable con una opción no elige nada: repite lo que ya dice el
    // marcador de posición.
    render(
      <DataTable<Row>
        data={ROWS}
        columns={[NAME]}
        pagination={{ pageSize: 25, total: 3 }}
        onSearchChange={() => undefined}
      />,
    );
    expect(screen.queryByRole("button", { name: "Seleccionar campo" })).toBeNull();
  });
});

describe("DataTable · la columna de selección", () => {
  it("es la PRIMERA celda aunque otra columna sea `alwaysVisible`", () => {
    render(<Harness />);
    const row = screen.getByText("Kokoa & Co").closest("tr");
    expect(row).not.toBeNull();
    const cells = within(row as HTMLElement).getAllByRole("cell");
    expect(within(cells[0]).getByRole("checkbox")).toBeInTheDocument();
  });

  it("`id: \"actions\"` sigue cerrando la fila: la compatibilidad no se rompe", () => {
    render(<Harness />);
    const row = screen.getByText("Kokoa & Co").closest("tr");
    const cells = within(row as HTMLElement).getAllByRole("cell");
    expect(within(cells[cells.length - 1]).getByRole("button", { name: "Abrir" })).toBeInTheDocument();
  });

  it("cada casilla se nombra con su registro", () => {
    render(<Harness />);
    expect(screen.getByRole("checkbox", { name: "Seleccionar Ferretería Ruiz" })).toBeInTheDocument();
  });

  it("una fila no seleccionable ofrece la casilla DESHABILITADA, no ausente", () => {
    // Quitarla dejaría la columna descuadrada y no diría por qué no se puede.
    render(<Harness isSelectable={(row) => row.id !== "c"} />);
    expect(screen.getByRole("checkbox", { name: "Seleccionar Ferretería Ruiz" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Seleccionar Kokoa & Co" })).toBeEnabled();
  });

  it("NO entra al selector de campos de búsqueda", () => {
    // Iba con `accessorKey` y encabezado vacío, así que metía una entrada en
    // blanco en el desplegable.
    render(
      <DataTable<Row>
        data={ROWS}
        columns={[NAME, { accessorKey: "city", header: "Ciudad", alwaysVisible: true }]}
        pagination={{ pageSize: 25, total: 3 }}
        onSearchChange={() => undefined}
        selection={{
          rowId: (row) => row.id,
          rowLabel: (row) => row.name,
          selected: new Set(),
          onChange: () => undefined,
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar campo" }));
    const options = screen.getAllByRole("menuitem");
    expect(options.map((option) => option.textContent)).toEqual(["Lead", "Ciudad"]);
  });
});

describe("DataTable · la casilla de cabecera", () => {
  it("queda en MIXTO con selección parcial", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Kokoa & Co" }));
    expect(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ })).toBePartiallyChecked();
  });

  it("desde MIXTO marca la página entera, no la limpia", () => {
    // Es lo que la memoria muscular espera; limpiar desde mixto obliga a dos
    // clics para lo más probable.
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Kokoa & Co" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ }));
    for (const name of ["Kokoa & Co", "Kokoro Sushi", "Ferretería Ruiz"]) {
      expect(screen.getByRole("checkbox", { name: `Seleccionar ${name}` })).toBeChecked();
    }
  });

  it("con todo marcado, limpia la página", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Quitar la selección de esta página" }));
    expect(screen.getByRole("checkbox", { name: "Seleccionar Kokoa & Co" })).not.toBeChecked();
  });

  it("solo cuenta las filas SELECCIONABLES", () => {
    render(<Harness isSelectable={(row) => row.id !== "c"} />);
    expect(screen.getByRole("checkbox", { name: "Seleccionar los 2 de esta página" })).toBeInTheDocument();
  });
});

describe("DataTable · la banda de selección", () => {
  it("no existe mientras no hay nada marcado", () => {
    render(<Harness allMatching={{ count: 412 }} />);
    expect(screen.queryByText(/está|están seleccionados/)).toBeNull();
  });

  it("ofrecer «los N que cumplen» es un SEGUNDO paso, no un efecto de marcar la cabecera", () => {
    render(<Harness allMatching={{ count: 412 }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ }));
    // La cabecera marcó la página: tres, no 412.
    expect(screen.getByText("Seleccionaste los 3 de esta página.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promover 3" })).toBeInTheDocument();
    // Y la oferta está ahí, sin haberse aplicado.
    expect(
      screen.getByRole("button", { name: "Seleccionar los 412 que cumplen el filtro" }),
    ).toBeInTheDocument();
  });

  it("el botón de lote dice el número REAL en cada modo", () => {
    render(<Harness allMatching={{ count: 412 }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ }));
    fireEvent.click(screen.getByRole("button", { name: "Seleccionar los 412 que cumplen el filtro" }));
    expect(screen.getByText("Los 412 que cumplen el filtro están seleccionados.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Promover 412" })).toBeInTheDocument();
  });

  it("por encima del tope NO se ofrece seleccionar todos", () => {
    // Sin endpoint que los materialice, ofrecerlo sería un botón que miente.
    render(<Harness allMatching={{ count: 40_000, limit: 1_000 }} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Seleccionar los 3/ }));
    expect(screen.queryByRole("button", { name: /que cumplen el filtro/ })).toBeNull();
    expect(screen.getByText(/Son demasiados/)).toBeInTheDocument();
  });
});
