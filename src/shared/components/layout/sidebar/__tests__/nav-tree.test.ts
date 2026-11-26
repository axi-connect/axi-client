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
    const tree = mapNavigation([
      dto("marketing", "/marketing", 10, [dto("marketing_campaigns", "/marketing/campaigns", 10, [], "megaphone")], "target"),
    ]);

    expect(tree[0].icon).toBeDefined();
    expect(tree[0].children[0].icon).toBeUndefined();
  });

  it("aplica los alias de ruta del frontend", () => {
    const tree = mapNavigation([
      dto("inbox", "/inbox", 10),
      dto("ai", "/ai-agents", 20),
      dto("catalog", "/catalog", 30),
    ]);

    expect(tree[0].url).toBe("/workspace/inbox");
    expect(tree[1].url).toBe("/admin/agents");
    expect(tree[2].url).toBe("/catalog/products");
  });

  it("filtra los módulos sin UI y poda el grupo que se queda vacío", () => {
    // /usage y /settings/audit están en UNIMPLEMENTED_NAV_PATHS.
    // Antes el testigo era /settings/channels, y luego /settings/sales: ambos
    // dejaron de servir cuando ganaron página (o alias) y salieron del Set. Un
    // testigo de este test tiene que ser un path que el backend siembra y el
    // frontend NO implementa todavía.
    const tree = mapNavigation([
      dto("analytics", "/analytics", 10, [dto("usage", "/usage", 10)]),
      dto("settings", null, 20, [dto("audit", "/settings/audit", 10)]),
    ]);

    // Analítica sobrevive (tiene ruta propia) pero pierde su único hijo.
    expect(tree.map((item) => item.code)).toEqual(["analytics"]);
    expect(tree[0].children).toEqual([]);
  });

  it("«Pagos» resuelve al hub, venga sembrado con el path viejo o con el nuevo", () => {
    // El seed pasó de `/settings/sales` a `/settings/payments` (F2 del programa
    // Cobros). El alias se queda mientras haya entornos con el seed anterior;
    // con el nuevo es identidad y no estorba.
    const legacy = mapNavigation([
      dto("sales", null, 10, [dto("sales_settings", "/settings/sales", 10)]),
    ]);
    expect(legacy[0].children[0].url).toBe("/settings/payments");

    const seeded = mapNavigation([
      dto("sales", null, 10, [dto("sales_settings", "/settings/payments", 10)]),
    ]);
    expect(seeded[0].children[0].url).toBe("/settings/payments");
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

  /**
   * F10: la entrada de los formularios de captura cuelga de
   * Configuración › Automatización (profundidad 2). El seeder del backend la
   * emite con `path: '/settings/forms'`, que debe pasar TAL CUAL: si acabara en
   * `UNIMPLEMENTED_NAV_PATHS` o necesitara un alias, el ítem se filtraría y la
   * página quedaría inalcanzable desde el menú — el mismo fallo que tuvo
   * `order_notifications`.
   */
  it("emite la entrada de formularios de captura anidada en Automatización", () => {
    const tree = mapNavigation([
      dto("settings", null, 60, [
        dto("automation", null, 40, [
          dto("quick_actions", "/settings/quick-actions", 10, [], "zap"),
          dto("order_notifications", "/settings/orders", 20, [], "bell-ring"),
          dto("intake_forms", "/settings/forms", 30, [], "clipboard-list"),
        ]),
      ]),
    ]);

    const automation = tree[0].children[0];
    const forms = automation.children.find((item) => item.code === "intake_forms");

    expect(forms?.url).toBe("/settings/forms");
    expect(forms?.depth).toBe(2);
  });

  /**
   * PLA-09: «Contactos» sale del menú y CRM queda como una sola entrada que
   * abre en contactos; «CMO» se lee «Axel» y se recoloca por la regla de
   * longitud (el más corto primero) que el backend aplicó con el rótulo viejo.
   */
  describe("CRM sin «Contactos» y «Axel» (PLA-09)", () => {
    const named = (code: string, name: string, path: string | null, sort_order: number, children: NavigationNodeDTO[] = []) =>
      ({ ...dto(code, path, sort_order, children), name });

    it("quita «Contactos»: CRM queda sin hijos, sigue en /crm y el clic va a contactos", () => {
      const tree = mapNavigation([named("crm", "CRM", "/crm", 10, [named("contacts", "Contactos", "/contacts", 10)])]);

      expect(tree).toHaveLength(1);
      expect(tree[0].children).toEqual([]);
      expect(tree[0].url).toBe("/crm");
      expect(tree[0].href).toBe("/crm/contacts");
    });

    it("solo CRM lleva destino de clic propio", () => {
      const tree = mapNavigation([named("inbox", "Inbox", "/inbox", 10)]);

      expect(tree[0].href).toBeUndefined();
    });

    it("«CMO» se lee «Axel» sin tocar código ni ruta", () => {
      const [axel] = mapNavigation([named("cmo", "CMO", "/cmo", 10)]);

      expect(axel.title).toBe("Axel");
      expect(axel.code).toBe("cmo");
      expect(axel.url).toBe("/cmo");
    });

    it("recoloca «Axel» por longitud: detrás de CRM (3) y antes de Inbox (5), sin mover el anclado", () => {
      // El orden real que emite el backend con el rótulo viejo.
      const tree = mapNavigation([
        named("dashboard", "Dashboard", "/dashboard", 10),
        named("cmo", "CMO", "/cmo", 20),
        named("crm", "CRM", "/crm", 30),
        named("inbox", "Inbox", "/inbox", 40),
        named("scheduling", "Agenda", "/scheduling", 50),
      ]);

      expect(tree.map((item) => item.title)).toEqual(["Dashboard", "CRM", "Axel", "Inbox", "Agenda"]);
    });

    it("sin hermanos más cortos, «Axel» se queda donde lo puso el backend", () => {
      // Sin permiso de CRM: no hay nada de 4 letras o menos además del anclado.
      const tree = mapNavigation([
        named("dashboard", "Dashboard", "/dashboard", 10),
        named("cmo", "CMO", "/cmo", 20),
        named("inbox", "Inbox", "/inbox", 30),
      ]);

      expect(tree.map((item) => item.title)).toEqual(["Dashboard", "Axel", "Inbox"]);
    });

    it("si el seed ya siembra «Axel», el orden del backend se respeta tal cual", () => {
      const tree = mapNavigation([
        named("dashboard", "Dashboard", "/dashboard", 10),
        named("crm", "CRM", "/crm", 20),
        named("cmo", "Axel", "/cmo", 30),
      ]);

      expect(tree.map((item) => item.title)).toEqual(["Dashboard", "CRM", "Axel"]);
    });
  });
});
