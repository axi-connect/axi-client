import { mapNavigation } from "../nav-tree";
import type { NavigationNodeDTO } from "../types";

/** Constructor breve de nodos del DTO. */
function dto(
  code: string,
  path: string | null,
  sort_order: number,
  children: NavigationNodeDTO[] = [],
  icon: string | null = null,
): NavigationNodeDTO {
  return { id: `id-${code}`, code, name: code, icon, path, sort_order, children };
}

describe("mapNavigation", () => {
  it("ordena por sort_order en cada nivel", () => {
    const tree = mapNavigation([
      dto("b", "/orders", 20),
      dto("a", "/dashboard", 10),
      dto("group", null, 30, [dto("y", "/settings/users", 20), dto("x", "/settings/company", 10)]),
    ]);

    expect(tree.map((item) => item.code)).toEqual(["a", "b", "group"]);
    expect(tree[2].children.map((item) => item.code)).toEqual(["x", "y"]);
  });

  it("resuelve el icono SOLO en el nivel 0", () => {
    const tree = mapNavigation([dto("crm", "/crm", 10, [dto("contacts", "/contacts", 10, [], "contact")], "target")]);

    expect(tree[0].icon).toBeDefined();
    expect(tree[0].children[0].icon).toBeUndefined();
  });

  it("aplica los alias de ruta del frontend", () => {
    const tree = mapNavigation([
      dto("inbox", "/inbox", 10),
      dto("crm", "/crm", 20, [dto("contacts", "/contacts", 10)]),
      dto("catalog", "/catalog", 30),
    ]);

    expect(tree[0].url).toBe("/workspace/inbox");
    expect(tree[1].children[0].url).toBe("/crm/contacts");
    expect(tree[2].url).toBe("/catalog/products");
  });

  it("filtra los módulos sin UI y poda el grupo que se queda vacío", () => {
    // /usage y /settings/channels están en UNIMPLEMENTED_NAV_PATHS.
    const tree = mapNavigation([
      dto("analytics", "/analytics", 10, [dto("usage", "/usage", 10)]),
      dto("settings", null, 20, [dto("channels", "/settings/channels", 10)]),
    ]);

    // Analítica sobrevive (tiene ruta propia) pero pierde su único hijo.
    expect(tree.map((item) => item.code)).toEqual(["analytics"]);
    expect(tree[0].children).toEqual([]);
  });

  it("la poda es recursiva: subgrupos vacíos arrastran al grupo padre", () => {
    const tree = mapNavigation([
      dto("settings", null, 10, [dto("security", null, 10, [dto("audit", "/settings/audit", 10)])]),
    ]);

    expect(tree).toEqual([]);
  });

  it("conserva el grupo puro que sí tiene hijos navegables", () => {
    const tree = mapNavigation([
      dto("sales", null, 10, [dto("orders", "/orders", 10), dto("catalog", "/catalog", 20)], "shopping-bag"),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].url).toBeUndefined();
    expect(tree[0].children.map((item) => item.code)).toEqual(["orders", "catalog"]);
  });

  it("asigna la profundidad correcta en 3 niveles", () => {
    const tree = mapNavigation([
      dto("settings", null, 10, [
        dto("security", null, 10, [dto("roles", "/settings/roles", 10)]),
      ]),
    ]);

    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
    expect(tree[0].children[0].children[0].depth).toBe(2);
  });

  it("expone `code` para poder persistir el estado abierto", () => {
    const tree = mapNavigation([dto("settings", null, 10, [dto("users", "/settings/users", 10)])]);

    expect(tree[0].code).toBe("settings");
    expect(tree[0].id).toBe("id-settings");
  });
});
