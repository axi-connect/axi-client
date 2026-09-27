import { byCreatedDesc, byName, localList } from "../local-list";

type Item = { name: string; code: string; created_at: string };
const item = (name: string, code: string, created_at: string): Item => ({ name, code, created_at });

const ITEMS = Array.from({ length: 23 }, (_, index) =>
  item(`Catálogo ${String(index + 1).padStart(2, "0")}`, `c-${index + 1}`, `2026-09-${String(index + 1).padStart(2, "0")}`),
);

describe("listas cortas en memoria (catálogo premium F4)", () => {
  it("pagina de 10 en 10: el 11.º en adelante se alcanza (antes no)", () => {
    const first = localList(ITEMS, { query: "", searchIn: (i) => [i.name], compare: byName, page: 1 });
    expect(first).toMatchObject({ total: 23, page: 1, pages: 3 });
    expect(first.items).toHaveLength(10);
    const last = localList(ITEMS, { query: "", searchIn: (i) => [i.name], compare: byName, page: 3 });
    expect(last.items.map((i) => i.code)).toEqual(["c-21", "c-22", "c-23"]);
  });

  it("una página que ya no existe cae a la última", () => {
    expect(localList(ITEMS, { query: "", searchIn: (i) => [i.name], compare: byName, page: 99 }).page).toBe(3);
  });

  it("busca sin tildes en los textos que se le dan y ordena de verdad", () => {
    const found = localList(
      [item("Temporada de verano", "verano-2026", "2026-09-21"), item("Principal", "principal", "2026-08-12"), item("Tienda en línea", "shopify", "2026-08-20")],
      { query: "LINEA", searchIn: (i) => [i.name, i.code], compare: byName, page: 1 },
    );
    expect(found.items.map((i) => i.name)).toEqual(["Tienda en línea"]);
    const recent = localList(ITEMS.slice(0, 3), { query: "", searchIn: (i) => [i.name], compare: byCreatedDesc, page: 1 });
    expect(recent.items.map((i) => i.code)).toEqual(["c-3", "c-2", "c-1"]);
  });
});
