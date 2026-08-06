import {
  CAMPAIGN_TEMPLATE_VARIABLES,
  extractTemplateVariables,
  invalidTemplateVariables,
  previewTemplate,
  renderTemplate,
  TEMPLATE_VARIABLES,
  unfilledTemplateVariables,
} from "../template";

describe("extractTemplateVariables", () => {
  it("normaliza mayúsculas y espacios dentro del placeholder", () => {
    expect(extractTemplateVariables("Hola {{ First_Name }} y {{PRODUCT}}")).toEqual([
      "first_name",
      "product",
    ]);
  });

  it("no repite la misma variable usada dos veces", () => {
    expect(extractTemplateVariables("{{first_name}}, {{first_name}}")).toEqual(["first_name"]);
  });

  it("devuelve vacío cuando no hay placeholders", () => {
    expect(extractTemplateVariables("Texto sin variables")).toEqual([]);
  });
});

describe("invalidTemplateVariables", () => {
  it("señala solo las que el backend rechazaría", () => {
    expect(invalidTemplateVariables("{{first_name}} {{inventada}} {{otra_mas}}")).toEqual([
      "inventada",
      "otra_mas",
    ]);
  });

  it("acepta el catálogo completo", () => {
    const body = TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(" ");
    expect(invalidTemplateVariables(body)).toEqual([]);
  });
});

describe("unfilledTemplateVariables", () => {
  it("avisa de las válidas que este contexto no rellena", () => {
    // En una campaña no hay cupón por destinatario ni carrito.
    expect(
      unfilledTemplateVariables(
        "Hola {{first_name}}, usa {{coupon_code}} por {{cart_total}}",
        CAMPAIGN_TEMPLATE_VARIABLES,
      ),
    ).toEqual(["coupon_code", "cart_total"]);
  });

  it("no confunde una variable inexistente con una no rellenable", () => {
    expect(unfilledTemplateVariables("{{inventada}}", CAMPAIGN_TEMPLATE_VARIABLES)).toEqual([]);
  });

  it("en automatizaciones se rellenan todas", () => {
    const body = TEMPLATE_VARIABLES.map((v) => `{{${v}}}`).join(" ");
    expect(unfilledTemplateVariables(body, TEMPLATE_VARIABLES)).toEqual([]);
  });
});

describe("renderTemplate", () => {
  it("sustituye los valores presentes", () => {
    expect(renderTemplate("Hola {{first_name}}", { first_name: "Ana" })).toBe("Hola Ana");
  });

  it("borra el placeholder sin dato y cierra el hueco", () => {
    // Nunca puede llegarle al cliente un "Hola {{first_name}}" ni un doble espacio.
    expect(renderTemplate("Hola {{first_name}}, ¿seguimos?", {})).toBe("Hola, ¿seguimos?");
  });

  it("no deja espacio antes de la puntuación al vaciar una variable", () => {
    expect(renderTemplate("Tu total es {{cart_total}}.", {})).toBe("Tu total es.");
  });

  it("un valor multilínea no rompe el layout del mensaje", () => {
    expect(renderTemplate("Producto: {{product}}", { product: "Camiseta\n  básica" })).toBe(
      "Producto: Camiseta básica",
    );
  });

  it("conserva los saltos de línea propios de la plantilla", () => {
    expect(renderTemplate("Hola {{first_name}}\nGracias", { first_name: "Ana" })).toBe(
      "Hola Ana\nGracias",
    );
  });

  it("recorta los extremos", () => {
    expect(renderTemplate("  {{first_name}}  ", { first_name: "Ana" })).toBe("Ana");
  });
});

describe("previewTemplate", () => {
  it("usa datos de ejemplo creíbles", () => {
    expect(previewTemplate("Hola {{first_name}}, usa {{coupon_code}}")).toBe(
      "Hola Ana, usa VUELVE10",
    );
  });

  it("en campañas omite las variables que no se rellenan, como hará el envío real", () => {
    expect(
      previewTemplate("Hola {{first_name}}, usa {{coupon_code}}", CAMPAIGN_TEMPLATE_VARIABLES),
    ).toBe("Hola Ana, usa");
  });

  it("nunca deja un placeholder crudo en la vista previa", () => {
    expect(previewTemplate("{{inventada}} hola")).not.toContain("{{");
  });
});
