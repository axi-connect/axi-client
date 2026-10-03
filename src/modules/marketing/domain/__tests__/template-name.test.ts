import {
  TEMPLATE_NAME_MAX,
  composeTemplateName,
  firstFreeVersion,
  formatTemplateBase,
  humanizeTemplateBase,
  isValidTemplateName,
  splitTemplateName,
  versionOptions,
} from "@/modules/marketing/domain/template-name";

describe("formatTemplateBase · se escribe como se dice, Meta recibe su formato", () => {
  it.each([
    ["¡Promo Día de la Madre 2026!", "promo_dia_de_la_madre_2026"],
    ["Temporada colección", "temporada_coleccion"],
    ["  Año   nuevo  ", "ano_nuevo"],
    ["Pedido #4821 — listo", "pedido_4821_listo"],
    ["ya_en_formato", "ya_en_formato"],
    ["___", ""],
  ])("«%s» → %s", (human, base) => {
    expect(formatTemplateBase(human)).toBe(base);
  });

  it("deja sitio para el sufijo de versión y no termina en guion bajo", () => {
    const base = formatTemplateBase(`${"a".repeat(200)} b`);
    expect(base.length).toBeLessThanOrEqual(TEMPLATE_NAME_MAX - 5);
    expect(base.endsWith("_")).toBe(false);
    expect(isValidTemplateName(composeTemplateName(base, 999))).toBe(true);
  });
});

describe("nombre y versión", () => {
  it("parte y compone", () => {
    expect(splitTemplateName("temporada_coleccion_v12")).toEqual({ base: "temporada_coleccion", version: 12 });
    expect(splitTemplateName("seguimiento")).toEqual({ base: "seguimiento", version: null });
    expect(composeTemplateName("temporada_coleccion", 2)).toBe("temporada_coleccion_v2");
  });

  it("humaniza una base sin inventar tildes", () => {
    expect(humanizeTemplateBase("temporada_coleccion")).toBe("Temporada coleccion");
    expect(humanizeTemplateBase("")).toBe("");
  });

  it("valida contra las reglas de Meta y el tope de la casa", () => {
    expect(isValidTemplateName("promo_v1")).toBe(true);
    expect(isValidTemplateName("ab")).toBe(false);
    expect(isValidTemplateName("Promo_v1")).toBe(false);
  });
});

describe("versionOptions · la siguiente libre, ya elegida", () => {
  const LIST = [
    { name: "temporada_coleccion_v1", language: "es_CO", approval_status: "approved" as const },
    { name: "temporada_coleccion_v3", language: "es_CO", approval_status: "rejected" as const },
    { name: "temporada_coleccion_v1", language: "en_US", approval_status: "approved" as const },
    { name: "otra_v1", language: "es_CO", approval_status: "approved" as const },
  ];

  it("marca las usadas en ESE idioma y propone la primera libre", () => {
    const options = versionOptions("temporada_coleccion", "es_CO", LIST);

    expect(options.map((option) => [option.version, option.taken?.reason ?? null])).toEqual([
      [1, "in_use"],
      [2, null],
      [3, "in_use"],
      [4, null],
    ]);
    expect(firstFreeVersion(options)).toBe(2);
  });

  it("la v1 en inglés no ocupa la v1 en español", () => {
    expect(firstFreeVersion(versionOptions("temporada_coleccion", "en_US", []))).toBe(1);
    expect(firstFreeVersion(versionOptions("temporada_coleccion", "es_CO", LIST.slice(2)))).toBe(1);
  });

  it("una reservada por Meta (409 al enviar) se salta y dice hasta cuándo", () => {
    const options = versionOptions("bienvenida", "es_CO", [], new Map([[1, "2026-10-28T00:00:00Z"]]));

    expect(options[0]).toEqual({ version: 1, taken: { reason: "reserved", until: "2026-10-28T00:00:00Z" } });
    expect(firstFreeVersion(options)).toBe(2);
  });

  it("una base nueva ofrece v1 y v2 libres", () => {
    expect(versionOptions("nueva", "es_CO", [])).toEqual([
      { version: 1, taken: null },
      { version: 2, taken: null },
    ]);
  });
});
