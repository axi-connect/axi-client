import {
  blockersChipLabel,
  enrichRequestedText,
  readinessCopy,
  readinessHeadline,
  type ReadinessFindingDTO,
} from "../readiness";

/**
 * «Salud del agente» (F11 partes críticas): el servidor manda código + datos y
 * aquí se decide qué se dice y adónde lleva cada arreglo.
 */
const finding = (
  code: ReadinessFindingDTO["code"],
  params: ReadinessFindingDTO["params"] = {},
  severity: ReadinessFindingDTO["severity"] = "blocker",
): ReadinessFindingDTO => ({
  code,
  severity,
  params,
});

describe("readinessCopy", () => {
  it("cada aviso que frena ventas lleva a la pantalla donde se arregla", () => {
    expect(readinessCopy(finding("delivery_without_zones"), { canEnrich: true }).action).toEqual({
      kind: "link",
      label: "Configurar envíos",
      href: "/settings/shipping",
    });
    expect(readinessCopy(finding("sales_without_payment_methods"), { canEnrich: true }).action).toEqual({
      kind: "link",
      label: "Agregar medios de pago",
      href: "/settings/payments",
    });
    expect(readinessCopy(finding("orders_stuck_on_form", { count: 4 }), { canEnrich: true })).toMatchObject({
      title: "4 pedidos no se crearon esta semana",
      action: { kind: "link", href: "/settings/forms" },
    });
  });

  it("singular cuando hay uno", () => {
    expect(readinessCopy(finding("orders_stuck_on_form", { count: 1 }), { canEnrich: true }).title).toBe(
      "1 pedido no se creó esta semana",
    );
    expect(
      readinessCopy(finding("catalog_not_enriched", { count: 1, misses: 1 }, "improvement"), { canEnrich: true }),
    ).toMatchObject({
      title: "1 producto sin sinónimos de búsqueda",
      detail: expect.stringContaining("no encontró lo que buscaban 1 vez.") as unknown,
    });
  });

  it("catálogo sin enriquecer: se arregla aquí con permiso de catálogo; sin él, va a Reconocimiento", () => {
    const catalog = finding("catalog_not_enriched", { count: 312, misses: 9 }, "improvement");
    expect(readinessCopy(catalog, { canEnrich: true })).toEqual({
      title: "312 productos sin sinónimos de búsqueda",
      detail:
        "Si el cliente lo pide con otras palabras («forro», «hot dog»), el agente no lo encuentra. Esta semana no encontró lo que buscaban 9 veces.",
      action: { kind: "enrich", label: "Generar sinónimos" },
    });
    expect(readinessCopy(catalog, { canEnrich: false }).action).toEqual({
      kind: "link",
      label: "Ir a Reconocimiento",
      href: "/settings/recognition",
    });
    expect(
      readinessCopy(finding("catalog_not_enriched", { count: 5 }, "improvement"), { canEnrich: true }).detail,
    ).not.toContain("Esta semana");
  });

  it("la regla que esconde datos cita la frase del tenant y baja a ella", () => {
    const copy = readinessCopy(
      finding(
        "prompt_hides_facts",
        { phrase: "el cupo es muy limitado", location: { field: "never", index: 1 } },
        "improvement",
      ),
      { canEnrich: true },
    );
    expect(copy.detail).toContain("«el cupo es muy limitado» lo empuja a inventar");
    expect(copy.action).toEqual({ kind: "rule", label: "Ver la regla" });
  });

  it("los miles van con separador colombiano", () => {
    expect(enrichRequestedText(1200)).toBe(
      "Listo: generando sinónimos para 1.200 productos. Tarda unos minutos y no tienes que esperar aquí.",
    );
  });
});

describe("readinessHeadline", () => {
  const blocker = { severity: "blocker" as const };
  const improvement = { severity: "improvement" as const };

  it("sin avisos no hay franja", () => {
    expect(readinessHeadline("Valentina", [])).toBeNull();
  });

  it("con algo que frena ventas: tono ámbar y las mejoras aparte", () => {
    expect(readinessHeadline("Valentina", [blocker, blocker, improvement, improvement])).toEqual({
      tone: "warn",
      title: "2 cosas frenan las ventas de Valentina",
      sub: " · 2 mejoras",
    });
    expect(readinessHeadline("Valentina", [blocker])).toEqual({
      tone: "warn",
      title: "1 cosa frena las ventas de Valentina",
      sub: "",
    });
  });

  it("solo mejoras: tono neutro, sin alarma", () => {
    expect(readinessHeadline("Valentina", [improvement])).toEqual({
      tone: "neutral",
      title: "1 mejora para Valentina",
      sub: "",
    });
  });
});

describe("blockersChipLabel", () => {
  it("solo lo que frena ventas llega a la rejilla", () => {
    expect(blockersChipLabel(0)).toBeNull();
    expect(blockersChipLabel(1)).toBe("1 frena ventas");
    expect(blockersChipLabel(3)).toBe("3 frenan ventas");
  });
});
