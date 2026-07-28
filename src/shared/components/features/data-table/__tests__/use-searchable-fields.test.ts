import { renderHook } from "@testing-library/react";
import type { ColumnDef, DataRow } from "../types";
import { useSearchableFields } from "../utils/hooks";

type Row = DataRow & { name: string; nit: string; users_count: number; created_at: string };

const COLUMNS: ColumnDef<Row>[] = [
  { accessorKey: "created_at", header: "Creada", searchable: false },
  { accessorKey: "users_count", header: "Usuarios" },
  { accessorKey: "nit", header: "NIT" },
  { accessorKey: "name", header: "Empresa" },
  { id: "actions" }, // sin accessorKey: nunca buscable
];

describe("useSearchableFields", () => {
  it("excluye columnas con searchable: false y respeta el orden preferido", () => {
    const { result } = renderHook(() => useSearchableFields<Row>(COLUMNS, ["name", "nit"]));

    expect(result.current.map((f) => f.key)).toEqual(["name", "nit", "users_count"]);
    expect(result.current.map((f) => f.label)).toEqual(["Empresa", "NIT", "Usuarios"]);
  });

  it("sin preferidas mantiene el orden de las columnas (buscables)", () => {
    const { result } = renderHook(() => useSearchableFields<Row>(COLUMNS, []));

    expect(result.current.map((f) => f.key)).toEqual(["users_count", "nit", "name"]);
  });
});
