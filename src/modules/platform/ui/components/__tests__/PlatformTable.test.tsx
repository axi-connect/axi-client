import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { PlatformTable, type PlatformColumn } from "../PlatformTable";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

type Row = { id: string; name: string; users: number };
const ROWS: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, name: `Empresa ${String.fromCharCode(65 + i)}`, users: i }));

const COLUMNS: PlatformColumn<Row>[] = [
  { id: "name", header: "Empresa", cell: (row) => row.name, sortValue: (row) => row.name },
  { id: "users", header: "Usuarios", cell: (row) => row.users, sortValue: (row) => row.users, align: "end" },
];

function setup(rows: Row[] = ROWS) {
  render(
    <PlatformTable
      label="Empresas"
      rows={rows}
      columns={COLUMNS}
      rowKey={(row) => row.id}
      rowHref={(row) => `/platform/tenants/${row.id}`}
      rowLabel={(row) => `Abrir ${row.name}`}
      rowActions={(row) => <button type="button">Menú de {row.name}</button>}
      mobileCard={(row) => <span>{row.name} (tarjeta)</span>}
      search={{ placeholder: "Nombre", textsOf: (row) => [row.name] }}
      unit="empresas"
      empty={<p>Aún no hay empresas</p>}
    />,
  );
}

const table = () => screen.getByRole("table", { name: "Empresas" });

describe("PlatformTable", () => {
  it("pagina de 10 y el pie cuenta sobre el total", () => {
    setup();
    expect(within(table()).getAllByRole("row")).toHaveLength(11); // cabecera + 10
    expect(screen.getByText("1–10 de 12 empresas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(screen.getByText("11–12 de 12 empresas")).toBeInTheDocument();
  });

  it("la fila entera abre su ficha (ratón y teclado); las acciones no", () => {
    setup();
    const row = screen.getByRole("row", { name: "Abrir Empresa A" });
    fireEvent.click(row);
    expect(push).toHaveBeenLastCalledWith("/platform/tenants/t0");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(push).toHaveBeenCalledTimes(2);
    fireEvent.click(within(row).getByRole("button", { name: "Menú de Empresa A" }));
    expect(push).toHaveBeenCalledTimes(2);
  });

  it("ordena al tocar la cabecera (asc → desc → sin orden)", () => {
    setup();
    const header = screen.getByRole("button", { name: /Usuarios/ });
    fireEvent.click(header);
    fireEvent.click(header);
    expect(screen.getByRole("columnheader", { name: /Usuarios/ })).toHaveAttribute("aria-sort", "descending");
    const first = within(table()).getAllByRole("row")[1]!;
    expect(first).toHaveAccessibleName("Abrir Empresa L");
  });

  it("en el celular la fila es una tarjeta que enlaza a su ficha", () => {
    setup();
    const list = screen.getByRole("list", { name: "Empresas" });
    expect(within(list).getByRole("link", { name: "Abrir Empresa A" })).toHaveAttribute("href", "/platform/tenants/t0");
  });

  it("buscar filtra y lo dice en el pie; sin coincidencias no es el vacío de origen", () => {
    jest.useFakeTimers();
    setup();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar en Empresas" }), { target: { value: "empresa b" } });
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
    expect(screen.getByText("1–1 de 1 que coinciden · 12 empresas en total")).toBeInTheDocument();
  });

  it("sin filas de origen pinta el vacío que pasa la vista", () => {
    setup([]);
    expect(screen.getByText("Aún no hay empresas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
