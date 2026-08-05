import { findActiveTrail, isPathMatch } from "../nav-active";
import type { SidebarNavItem } from "../types";

/** Constructor breve de nodos: solo lo que mira el matcher. */
function node(code: string, url?: string, children: SidebarNavItem[] = []): SidebarNavItem {
  return { id: code, code, title: code, url, depth: 0, children };
}

describe("isPathMatch", () => {
  it("coincide exacto", () => {
    expect(isPathMatch("/dashboard", "/dashboard")).toBe(true);
  });

  it("coincide como prefijo de segmento", () => {
    expect(isPathMatch("/crm/contacts", "/crm/contacts/abc-123")).toBe(true);
  });

  it("NO coincide con un prefijo de string que no es de segmento", () => {
    // El bug clásico que evita el `+ "/"`.
    expect(isPathMatch("/dashboard", "/dashboard-legacy")).toBe(false);
    expect(isPathMatch("/orders", "/orders-archive")).toBe(false);
  });
});

describe("findActiveTrail", () => {
  const tree = [
    node("dashboard", "/dashboard"),
    node("inbox", "/workspace/inbox"),
    node("crm", "/crm", [node("contacts", "/crm/contacts")]),
    // Grupo puro: sin url, solo agrupa.
    node("settings", undefined, [
      node("company_settings", "/settings/company"),
      node("security", undefined, [
        node("users", "/settings/users"),
        node("roles", "/settings/roles"),
      ]),
    ]),
  ];

  it("nivel superior: rastro de un solo código", () => {
    expect(findActiveTrail(tree, "/dashboard")).toEqual(["dashboard"]);
  });

  it("gana la ruta MÁS específica, no la primera que coincide", () => {
    // /crm y /crm/contacts ambos cubren el pathname: debe ganar el hijo.
    expect(findActiveTrail(tree, "/crm/contacts")).toEqual(["crm", "contacts"]);
  });

  it("ruta profunda con id: el activo sigue siendo el hijo", () => {
    expect(findActiveTrail(tree, "/crm/contacts/abc-123")).toEqual(["crm", "contacts"]);
  });

  it("el padre gana cuando el pathname no baja al hijo", () => {
    expect(findActiveTrail(tree, "/crm")).toEqual(["crm"]);
  });

  it("nivel 3: el rastro atraviesa los grupos puros", () => {
    expect(findActiveTrail(tree, "/settings/roles")).toEqual(["settings", "security", "roles"]);
  });

  it("inbox con conversación abierta", () => {
    expect(findActiveTrail(tree, "/workspace/inbox/42")).toEqual(["inbox"]);
  });

  it("pathname fuera del árbol → rastro vacío", () => {
    expect(findActiveTrail(tree, "/otra-cosa")).toEqual([]);
  });

  it("un grupo puro nunca es el activo por sí mismo", () => {
    // No hay ruta /settings, así que nada se activa.
    expect(findActiveTrail(tree, "/settings")).toEqual([]);
  });
});
