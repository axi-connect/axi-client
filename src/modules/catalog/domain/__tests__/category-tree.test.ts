import { categoryTreeStats, searchCategoryTree, type CategoryTreeNodeDTO } from "../category";

const node = (id: string, name: string, children: CategoryTreeNodeDTO[] = [], o: Partial<CategoryTreeNodeDTO> = {}): CategoryTreeNodeDTO =>
  ({
    id,
    parent_id: null,
    name,
    description: null,
    position: 0,
    is_active: true,
    origin: "platform",
    taxonomy_code: "t",
    search_aliases: [],
    created_at: "",
    updated_at: "",
    product_count: 0,
    children,
    ...o,
  }) as CategoryTreeNodeDTO;

const TREE = [
  node("facial", "Cuidado facial", [
    node("serums", "Sérums", [], { search_aliases: ["suero", "concentrado"] }),
    node("tonicos", "Tónicos", [], { origin: "tenant", taxonomy_code: null }),
  ]),
  node("kits", "Kits", [], { origin: "integration", taxonomy_code: null }),
  node("trat", "Tratamientos", [node("laser", "Láser", [node("micro", "Microblading", [], { is_active: false })])]),
];

describe("el árbol de categorías (catálogo premium F4)", () => {
  it("cuenta categorías por origen, ocultas y niveles usados", () => {
    expect(categoryTreeStats(TREE)).toEqual({
      total: 7,
      byOrigin: { platform: 5, tenant: 1, integration: 1 },
      hidden: 1,
      depth: 3,
    });
    expect(categoryTreeStats([])).toEqual({ total: 0, byOrigin: { platform: 0, tenant: 0, integration: 0 }, hidden: 0, depth: 0 });
  });

  it("busca en TODO el árbol, también en ramas plegadas, y despliega los ancestros", () => {
    const result = searchCategoryTree(TREE, "micro");
    expect(result.matches).toBe(1);
    expect(result.nodes.map((root) => root.id)).toEqual(["trat"]);
    expect([...result.expand].sort()).toEqual(["laser", "trat"]);
  });

  it("sin tildes ni mayúsculas, y por sinónimo", () => {
    expect(searchCategoryTree(TREE, "SERUM").matches).toBe(1);
    expect(searchCategoryTree(TREE, "tonico").matches).toBe(1);
    const bySynonym = searchCategoryTree(TREE, "suero");
    expect(bySynonym.matches).toBe(1);
    expect(bySynonym.nodes[0].children?.map((child) => child.id)).toEqual(["serums"]);
  });

  it("sin búsqueda devuelve el árbol entero; sin coincidencias, nada", () => {
    expect(searchCategoryTree(TREE, "  ").nodes).toBe(TREE);
    expect(searchCategoryTree(TREE, "retinol")).toMatchObject({ nodes: [], matches: 0 });
  });
});
