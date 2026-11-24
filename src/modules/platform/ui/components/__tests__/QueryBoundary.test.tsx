import { fireEvent, render, screen } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import { QueryBoundary } from "../QueryBoundary";

const boom = new HttpError({ status: 500, code: "internal/unexpected", message: "Se cayó la base" });

function setup(query: { data: string[] | undefined; isPending: boolean; isError: boolean; error: unknown }) {
  const refetch = jest.fn();
  render(
    <QueryBoundary
      query={{ ...query, refetch }}
      isEmpty={(rows) => rows.length === 0}
      loading={<p>Cargando…</p>}
      empty={<p>Todavía no hay ningún proveedor conectado</p>}
    >
      {(rows) => <ul>{rows.map((row) => <li key={row}>{row}</li>)}</ul>}
    </QueryBoundary>,
  );
  return { refetch };
}

describe("QueryBoundary: error ≠ vacío", () => {
  it("un fallo sin datos pinta el error con «Reintentar», nunca el vacío", () => {
    const { refetch } = setup({ data: undefined, isPending: false, isError: true, error: boom });
    expect(screen.queryByText(/todavía no hay/i)).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("un vacío sano pinta el vacío", () => {
    setup({ data: [], isPending: false, isError: false, error: null });
    expect(screen.getByText(/todavía no hay/i)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("cargando pinta la silueta", () => {
    setup({ data: undefined, isPending: true, isError: false, error: null });
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
  });

  it("con datos y un refresco fallido conserva los datos y avisa encima", () => {
    setup({ data: ["MillionVerifier"], isPending: false, isError: true, error: boom });
    expect(screen.getByText("MillionVerifier")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
