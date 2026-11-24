import {
  ADMISSION_DATA_FIELDS,
  REQUIRABLE_LABELS,
  REQUIRABLE_ORDER,
} from "../../../domain/criteria";
import {
  LEGAL_BASIS_LABELS,
  QUALITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "../../../domain/lead";
import {
  LEAD_FILTERS,
  countLeadFilters,
  serializeLeadFilters,
} from "../leads.filters";

/**
 * Este fichero existe por UN bug concreto, y el primer test lleva su nombre.
 *
 * Los tres desplegables anteriores tenían sus opciones escritas a mano dentro
 * del JSX. El de orígenes listaba tres de los seis y le faltaban
 * `google_places`, `openstreetmap` y `serp` — o sea TODOS los que produce una
 * búsqueda, que son la mayoría de la bandeja. Nadie lo vio en meses porque una
 * opción que no existe no da error: simplemente no se puede pedir.
 *
 * Lo que se blinda no es que hoy estén los seis: es que **las opciones se
 * generen del diccionario**, de modo que añadir un origen en el backend rompa
 * la compilación aquí y falle este test si alguien vuelve a escribirlas a mano.
 */

/** Los valores que ofrece un filtro. Los umbrales admiten `null` («cualquiera»). */
function optionsOf(key: string): (string | number | null)[] {
  const def = LEAD_FILTERS.filters.find((filter) => filter.key === key);
  if (def === undefined) throw new Error(`Sin filtro '${key}'`);
  if (!("options" in def)) throw new Error(`El filtro '${key}' no tiene opciones`);
  return def.options.map((option) => option.value);
}

describe("LEAD_FILTERS — las opciones salen del diccionario, no del JSX", () => {
  it("EL BUG: el filtro de origen ofrece los SEIS orígenes, incluidos los de búsqueda", () => {
    expect([...optionsOf("source")].sort()).toEqual(Object.keys(SOURCE_LABELS).sort());
    // Los tres que faltaban, nombrados: son los que produce el descubrimiento.
    for (const source of ["google_places", "openstreetmap", "serp"]) {
      expect(optionsOf("source")).toContain(source);
    }
  });

  it("el filtro de estado ofrece todos los pedibles y NINGUNO más", () => {
    // `enriching` queda fuera a propósito: es un lead que la puerta de admisión
    // aún no ha juzgado, nace invisible y el backend lo excluye de la bandeja.
    // Ofrecerlo sería un filtro que siempre devuelve vacío.
    const offered = optionsOf("status");
    expect(offered).not.toContain("enriching");
    expect([...offered].sort()).toEqual(
      Object.keys(STATUS_LABELS)
        .filter((status) => status !== "enriching")
        .sort(),
    );
  });

  it("calidad del dato y base legal salen completas de sus diccionarios", () => {
    expect([...optionsOf("quality_status")].sort()).toEqual(Object.keys(QUALITY_LABELS).sort());
    expect([...optionsOf("legal_basis")].sort()).toEqual(Object.keys(LEGAL_BASIS_LABELS).sort());
  });

  it("los datos exigibles son los MISMOS que puede exigir una búsqueda", () => {
    // Dos pantallas preguntando lo mismo con dos listas de palabras acaban
    // divergiendo siempre; esto lo impide.
    expect([...optionsOf("require")].sort()).toEqual([...REQUIRABLE_ORDER].sort());
    expect([...optionsOf("require")].sort()).toEqual(Object.keys(REQUIRABLE_LABELS).sort());
  });

  it("«cuántos datos» llega hasta los cinco que existen, y no más", () => {
    const def = LEAD_FILTERS.filters.find((filter) => filter.key === "min_data");
    expect(def).toBeDefined();
    expect(def && "max" in def ? def.max : null).toBe(ADMISSION_DATA_FIELDS);
  });

  it("el conmutador todos/alguno cuelga de los DATOS, no de un campo suelto", () => {
    const def = LEAD_FILTERS.filters.find((filter) => filter.key === "require");
    expect(def && "modeKey" in def ? def.modeKey : null).toBe("require_mode");
  });
});

describe("serializeLeadFilters — lo que viaja por el alambre", () => {
  it("los multivalor viajan como CSV, NUNCA como arreglo", () => {
    // `Params` está tipado a primitivos y `http.ts` hace `String(value)`: un
    // arreglo funcionaría por accidente y un objeto se volvería
    // «[object Object]» sin que nada avise.
    const params = serializeLeadFilters({
      source: ["openstreetmap", "google_places"],
      quality_status: ["verified"],
    });
    expect(params.source).toBe("openstreetmap,google_places");
    expect(params.quality_status).toBe("verified");
    for (const value of Object.values(params)) {
      expect(Array.isArray(value)).toBe(false);
    }
  });

  // CAP-18: el servidor ya no trae a los promovidos si nadie los pide. Pedirlos
  // es marcar «En el CRM» en el filtro de estado, que viaja como siempre.
  it("«En el CRM» se puede pedir: viaja como `status=promoted`, solo o con otros estados", () => {
    expect(optionsOf("status")).toContain("promoted");
    expect(serializeLeadFilters({ status: ["promoted"] }).status).toBe("promoted");
    expect(serializeLeadFilters({ status: ["qualified", "promoted"] }).status).toBe("qualified,promoted");
    // Sin marcarlo no viaja nada: ocultarlos es cosa del servidor, no un filtro del cliente.
    expect(serializeLeadFilters({})).not.toHaveProperty("status");
  });

  it("los datos exigidos viajan con su modo", () => {
    const params = serializeLeadFilters({
      require: ["instagram", "email"],
      require_mode: "any",
    });
    expect(params.require).toBe("instagram,email");
    expect(params.require_mode).toBe("any");
  });

  it("un filtro sin poner no viaja", () => {
    expect(serializeLeadFilters({})).toEqual({});
    // Un multi vacío tampoco: mandar `source=` sería pedir «ninguno».
    expect(serializeLeadFilters({ source: [] })).toEqual({});
  });

  it("las fechas viajan con los nombres que el backend ya usaba", () => {
    const params = serializeLeadFilters({
      created: ["2026-08-01T00:00:00.000Z", "2026-08-31T23:59:59.000Z"],
    });
    expect(params.created_after).toBe("2026-08-01T00:00:00.000Z");
    expect(params.created_before).toBe("2026-08-31T23:59:59.000Z");
  });

  it("el índice de calidad viaja como número, con techo aparte", () => {
    const params = serializeLeadFilters({ min_score: 60, max_score: 79 });
    expect(params.min_score).toBe(60);
    expect(params.max_score).toBe(79);
  });
});

describe("countLeadFilters — el contador del botón", () => {
  it("cuenta solo lo que de verdad filtra", () => {
    expect(countLeadFilters({})).toBe(0);
    expect(countLeadFilters({ source: [] })).toBe(0);
    expect(countLeadFilters({ source: ["serp"], min_data: 4 })).toBe(2);
  });

  it("el MODO no cuenta como filtro: no estrecha nada por sí solo", () => {
    // Contarlo haría que el botón dijera «1» sin que nada esté filtrado.
    expect(countLeadFilters({ require_mode: "any" })).toBe(0);
  });
});

describe("«Con quien decide»", () => {
  it("viaja como `has_decision_maker=true` y solo cuando está puesto", () => {
    expect(serializeLeadFilters({ has_decision_maker: true })).toEqual({ has_decision_maker: true });
    expect(serializeLeadFilters({ has_decision_maker: false })).toEqual({});
    expect(serializeLeadFilters({})).toEqual({});
  });

  it("cuenta como un filtro activo y convive con los demás", () => {
    expect(countLeadFilters({ has_decision_maker: true })).toBe(1);
    expect(serializeLeadFilters({ has_decision_maker: true, city: "Bogotá" })).toEqual({
      has_decision_maker: true,
      city: "Bogotá",
    });
  });
});
