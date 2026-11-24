import { filterRows, paginate, sortRowsBy } from "../table";

type Row = { name: string; users: number | null; created: string };
const ROWS: Row[] = [
  { name: "Óptica Visión", users: 9, created: "2026-11-20" },
  { name: "café montaña", users: null, created: "2026-11-23" },
  { name: "Norte Studio", users: 6, created: "2026-11-24" },
  { name: "Clínica Aurora", users: 22, created: "2026-10-01" },
];

describe("tabla de la plataforma: buscar, ordenar, paginar", () => {
  it("busca todas las palabras, sin tildes ni mayúsculas", () => {
    expect(filterRows(ROWS, "optica", (r) => [r.name]).map((r) => r.name)).toEqual(["Óptica Visión"]);
    expect(filterRows(ROWS, "CAFE mont", (r) => [r.name])).toHaveLength(1);
    expect(filterRows(ROWS, "  ", (r) => [r.name])).toHaveLength(4);
  });

  it("ordena números por valor y deja los vacíos al final en los dos sentidos", () => {
    expect(sortRowsBy(ROWS, (r) => r.users, "asc").map((r) => r.users)).toEqual([6, 9, 22, null]);
    expect(sortRowsBy(ROWS, (r) => r.users, "desc").map((r) => r.users)).toEqual([22, 9, 6, null]);
  });

  it("ordena textos en español (la tilde no manda al final)", () => {
    expect(sortRowsBy(ROWS, (r) => r.name, "asc").map((r) => r.name)).toEqual([
      "café montaña",
      "Clínica Aurora",
      "Norte Studio",
      "Óptica Visión",
    ]);
  });

  it("pagina sobre el total y recorta una página que ya no existe", () => {
    const rows = Array.from({ length: 23 }, (_, i) => i);
    expect(paginate(rows, 1, 10)).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 10, total: 23 });
    expect(paginate(rows, 3, 10)).toMatchObject({ rows: [20, 21, 22], from: 21, to: 23 });
    expect(paginate(rows, 9, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0, total: 0 });
  });
});
