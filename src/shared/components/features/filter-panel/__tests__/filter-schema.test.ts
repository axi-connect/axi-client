import {
  clearAll,
  countActive,
  describeFilters,
  removeFilter,
  serializeFilters,
  type FilterSchema,
} from "@/shared/components/features/filter-panel";

/**
 * Lo que blindan estos tests es la SERIALIZACIÓN, que es la razón de existir del
 * módulo y una trampa con historia en este repo:
 *
 * - `buildListParams` castea a `string | number | boolean | undefined` y
 *   `http.ts` hace `String(value)`, así que un arreglo se convierte en `a,b,c`
 *   **por accidente** y un objeto en `"[object Object]"` **en silencio**. Aquí
 *   se comprueba que lo que sale nunca es un arreglo.
 * - Un backend lee `verified_only=false` como «exijo que NO esté verificado».
 *   Un interruptor apagado no puede viajar, y eso no se ve mirando la pantalla.
 */

const SCHEMA: FilterSchema = {
  sections: [{ id: "datos", title: "Datos del lead" }],
  filters: [
    {
      kind: "multi",
      key: "status",
      label: "Estado",
      options: [
        { value: "new", label: "Nuevo" },
        { value: "contacted", label: "Contactado" },
        { value: "rejected", label: "Fuera del cliente ideal" },
      ],
    },
    {
      kind: "single",
      key: "quality_status",
      label: "Calidad",
      paramName: "quality",
      options: [
        { value: "good", label: "Bueno" },
        { value: "poor", label: "Flojo" },
      ],
    },
    {
      kind: "flags",
      key: "require",
      label: "Datos exigidos",
      section: "datos",
      modeKey: "require_mode",
      modeLabels: { all: "Todos", any: "Al menos uno" },
      options: [
        { value: "instagram", label: "Instagram" },
        { value: "email", label: "Correo" },
      ],
    },
    {
      kind: "steps",
      key: "min_score",
      label: "Calidad mínima",
      options: [
        { value: null, label: "Cualquiera" },
        { value: 60, label: "60 o más · bueno" },
      ],
    },
    { kind: "count", key: "min_data", label: "Datos completos", max: 5 },
    { kind: "switch", key: "verified_only", label: "Solo verificados" },
    { kind: "text", key: "city", label: "Ciudad", placeholder: "Bogotá" },
    { kind: "date", key: "created", label: "Fecha de entrada", mode: "range" },
  ],
};

describe("serializeFilters", () => {
  it("un multivalor vacío no viaja", () => {
    expect(serializeFilters(SCHEMA, { status: [] })).toEqual({});
    expect(serializeFilters(SCHEMA, {})).toEqual({});
  });

  it("un interruptor en falso NO viaja, y en verdadero sí", () => {
    // El fallo que evita: `verified_only=false` significa «exijo que NO esté
    // verificado», que es lo contrario de «no me importa».
    expect(serializeFilters(SCHEMA, { verified_only: false })).toEqual({});
    expect(serializeFilters(SCHEMA, { verified_only: true })).toEqual({ verified_only: true });
  });

  it("un multivalor viaja como CSV y nunca como arreglo", () => {
    const params = serializeFilters(SCHEMA, { status: ["new", "contacted"] });

    expect(params.status).toBe("new,contacted");
    expect(Array.isArray(params.status)).toBe(false);
    // La invariante dura: nada de lo que sale de aquí puede ser un arreglo.
    expect(Object.values(params).some((value) => Array.isArray(value))).toBe(false);
  });

  it("paramName sustituye a la llave", () => {
    const params = serializeFilters(SCHEMA, { quality_status: "good" });

    expect(params).toEqual({ quality: "good" });
    expect(params.quality_status).toBeUndefined();
  });

  it("flags con modeKey emite el modo, y `all` es el valor por defecto", () => {
    expect(serializeFilters(SCHEMA, { require: ["instagram", "email"] })).toEqual({
      require: "instagram,email",
      require_mode: "all",
    });

    expect(
      serializeFilters(SCHEMA, { require: ["instagram", "email"], require_mode: "any" }),
    ).toEqual({ require: "instagram,email", require_mode: "any" });
  });

  it("sin datos exigidos el modo tampoco viaja", () => {
    expect(serializeFilters(SCHEMA, { require_mode: "any" })).toEqual({});
  });

  it("steps y count viajan crudos, y el 0 y el nulo no viajan", () => {
    expect(serializeFilters(SCHEMA, { min_score: 60, min_data: 4 })).toEqual({
      min_score: 60,
      min_data: 4,
    });
    expect(serializeFilters(SCHEMA, { min_score: undefined, min_data: 0 })).toEqual({});
  });

  it("el texto viaja recortado y en blanco no viaja", () => {
    expect(serializeFilters(SCHEMA, { city: "  Bogotá  " })).toEqual({ city: "Bogotá" });
    expect(serializeFilters(SCHEMA, { city: "   " })).toEqual({});
  });

  it("una fecha emite _after y _before", () => {
    expect(serializeFilters(SCHEMA, { created: ["2026-08-01", "2026-08-31"] })).toEqual({
      created_after: "2026-08-01",
      created_before: "2026-08-31",
    });
    expect(serializeFilters(SCHEMA, { created: ["2026-08-01", ""] })).toEqual({
      created_after: "2026-08-01",
    });
  });

  it("lo que no es del esquema no se cuela en los parámetros", () => {
    // `sort`, `page` y el buscador viven en el mismo objeto de estado y no son
    // filtros: los serializa quien los posee, no este módulo.
    expect(serializeFilters(SCHEMA, { sort: "recent", status: ["new"] })).toEqual({
      status: "new",
    });
  });

  it("un serialize propio manda sobre la tabla", () => {
    const schema: FilterSchema = {
      filters: [
        {
          kind: "text",
          key: "window",
          label: "Ventana",
          serialize: (value) => (value ? { from: String(value), to: "hoy" } : {}),
        },
      ],
    };

    expect(serializeFilters(schema, { window: "2026-08-01" })).toEqual({
      from: "2026-08-01",
      to: "hoy",
    });
  });
});

describe("countActive", () => {
  it("cuenta filtros, no valores", () => {
    expect(countActive(SCHEMA, { status: ["new", "contacted", "rejected"] })).toBe(1);
  });

  it("no cuenta lo vacío, ni el falso, ni el cero, ni el modo", () => {
    expect(
      countActive(SCHEMA, {
        status: [],
        city: "  ",
        verified_only: false,
        min_data: 0,
        require_mode: "any",
        created: ["", ""],
      }),
    ).toBe(0);
  });

  it("suma un filtro por cada uno que esté puesto", () => {
    expect(
      countActive(SCHEMA, {
        status: ["new"],
        min_score: 60,
        verified_only: true,
        city: "Bogotá",
      }),
    ).toBe(4);
  });
});

describe("describeFilters", () => {
  it("deriva la etiqueta del chip del esquema, no del consumidor", () => {
    const chips = describeFilters(SCHEMA, {
      status: ["new", "rejected"],
      quality_status: "good",
      min_score: 60,
      min_data: 4,
      verified_only: true,
      city: "Bogotá",
      created: ["2026-08-01", "2026-08-31"],
    });

    expect(chips).toEqual([
      { key: "status", label: "Estado: Nuevo, Fuera del cliente ideal" },
      { key: "quality_status", label: "Calidad: Bueno" },
      { key: "min_score", label: "Calidad mínima: 60 o más · bueno" },
      { key: "min_data", label: "Datos completos: 4 de 5" },
      // Un booleano no tiene valor que enseñar: el chip ES la etiqueta.
      { key: "verified_only", label: "Solo verificados" },
      { key: "city", label: "Ciudad: Bogotá" },
      { key: "created", label: "Fecha de entrada: 2026-08-01 – 2026-08-31" },
    ]);
  });

  it("el separador de los datos exigidos DICE el modo", () => {
    const values = { require: ["instagram", "email"] };

    expect(describeFilters(SCHEMA, values)[0].label).toBe("Datos exigidos: Instagram y Correo");
    expect(describeFilters(SCHEMA, { ...values, require_mode: "any" })[0].label).toBe(
      "Datos exigidos: Instagram o Correo",
    );
  });

  it("no pinta chip de lo que no está puesto", () => {
    expect(describeFilters(SCHEMA, { status: [], verified_only: false })).toEqual([]);
  });
});

describe("clearAll y removeFilter", () => {
  it("limpiar quita los filtros y CONSERVA lo que no es del esquema", () => {
    const next = clearAll(SCHEMA, {
      status: ["new"],
      require: ["email"],
      require_mode: "any",
      sort: "recent",
      page: 3,
    });

    expect(next).toEqual({ sort: "recent", page: 3 });
  });

  it("quitar un filtro de datos se lleva su conmutador de modo", () => {
    const next = removeFilter(SCHEMA, { require: ["email"], require_mode: "any", city: "Cali" }, "require");

    expect(next).toEqual({ city: "Cali" });
  });

  it("no mutan el objeto que reciben", () => {
    const values = { status: ["new"] };

    clearAll(SCHEMA, values);
    removeFilter(SCHEMA, values, "status");

    expect(values).toEqual({ status: ["new"] });
  });
});
