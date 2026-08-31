import {
  admissionChips,
  admissionSentence,
  costOf,
  EMPTY_ADMISSION,
  hasAdmission,
  isInFlight,
  paramsOf,
  progressOf,
  queryOf,
  summaryOf,
  type SearchDTO,
} from "../search";

function search(overrides: Partial<SearchDTO> = {}): SearchDTO {
  return {
    id: "search-1",
    source: "openstreetmap",
    label: null,
    status: "running",
    params: {
      text: null,
      category: "panaderia",
      city: "Bogotá",
      country: "CO",
      radius_m: 3000,
      limit: 100,
      admission: {
        min_score: null,
        min_data: null,
        require: [],
        verified_only: false,
        max_records: null,
      },
    },
    found_count: 25,
    new_count: 20,
    duplicate_count: 4,
    rejected_count: 1,
    filtered_count: 0,
    units_spent: 0,
    estimated_total: null,
    error: null,
    started_at: null,
    finished_at: null,
    created_at: "2026-08-28T10:00:00.000Z",
    ...overrides,
  } as SearchDTO;
}

describe("progressOf", () => {
  it("mide contra el TOPE del tenant, no contra el estimado del proveedor", () => {
    // El estimado se mueve a mitad de la búsqueda; el tope no. Una barra que
    // retrocede porque el proveedor dijo que había más es peor que no tenerla.
    expect(progressOf(search({ found_count: 25, estimated_total: 900 }))).toBe(0.25);
  });

  it("no pasa de 1 aunque el proveedor devuelva de más en la última página", () => {
    expect(progressOf(search({ found_count: 120 }))).toBe(1);
  });

  it("una búsqueda terminada está al 100 %, haya traído lo que haya traído", () => {
    expect(progressOf(search({ status: "partial", found_count: 3 }))).toBe(1);
  });
});

describe("isInFlight", () => {
  it.each([
    ["queued", true],
    ["running", true],
    ["completed", false],
    ["partial", false],
    ["failed", false],
    ["cancelled", false],
  ])("%s → %s", (status, expected) => {
    expect(isInFlight(search({ status: status as SearchDTO["status"] }))).toBe(expected);
  });
});

describe("summaryOf", () => {
  it("los duplicados y los vetados solo se mencionan si los hubo", () => {
    expect(summaryOf(search({ new_count: 20, duplicate_count: 0, rejected_count: 0 }))).toBe(
      "20 nuevos",
    );
  });

  it("nombra el veto por lo que es, no como «descartados» a secas", () => {
    // Que los tirara el cliente ideal del dueño cambia qué hacer: revisar el
    // ICP. «Descartados» a secas no le dice a nadie que puede ajustarlo.
    expect(summaryOf(search())).toContain("fuera de tu cliente ideal");
  });
});

describe("costOf", () => {
  it("cero unidades se dice «gratis», no «0 unidades»", () => {
    expect(costOf(search({ units_spent: 0 }))).toBe("gratis");
  });

  it("y lo que costó se dice con separador de miles", () => {
    expect(costOf(search({ units_spent: 1284 }))).toBe("1.284 unidades");
  });
});

describe("paramsOf", () => {
  it("ARRASTRA LOS FILTROS: sin ellos, «Repetir» traería el triple de leads", () => {
    const filtrada = search({
      params: { ...search().params, admission: { ...EMPTY_ADMISSION, min_data: 3 } },
    });
    expect(paramsOf(filtrada).admission).toMatchObject({ min_data: 3 });
  });

  it("devuelve exactamente lo necesario para repetirla, sin nulls", () => {
    // Un `text: null` viajando al backend cambia la consulta del proveedor:
    // los campos vacíos tienen que desaparecer, no ir en null.
    const repeat = paramsOf(search());
    expect(repeat).toEqual({
      source: "openstreetmap",
      label: undefined,
      text: undefined,
      category: "panaderia",
      city: "Bogotá",
      country: "CO",
      radius_m: 3000,
      limit: 100,
      admission: EMPTY_ADMISSION,
    });
  });
});

describe("queryOf", () => {
  it("resume la búsqueda empezando por la fuente", () => {
    expect(queryOf(search())).toBe("OpenStreetMap · panaderia · Bogotá");
  });
});


describe("hasAdmission", () => {
  it("el techo de gasto NO es un criterio: no rechaza a nadie", () => {
    // Si contara, poner un techo cambiaría el significado del tope sin que el
    // usuario haya pedido ningún filtro.
    expect(hasAdmission({ ...EMPTY_ADMISSION, max_records: 100 })).toBe(false);
  });

  it.each([
    ["min_score", { min_score: 40 }],
    ["min_data", { min_data: 3 }],
    ["require", { require: ["instagram" as const] }],
    ["verified_only", { verified_only: true }],
  ])("%s sí lo es", (_name, patch) => {
    expect(hasAdmission({ ...EMPTY_ADMISSION, ...patch })).toBe(true);
  });
});

describe("progressOf con filtros", () => {
  it("mide ADMITIDOS, no encontrados", () => {
    // Con la cuenta de encontrados, una búsqueda filtrada llegaría al 100 %
    // teniendo tres leads en la bandeja.
    const filtrada = search({
      params: { ...search().params, limit: 25, admission: { ...EMPTY_ADMISSION, min_score: 40 } },
      found_count: 91,
      new_count: 18,
    });
    expect(progressOf(filtrada)).toBeCloseTo(18 / 25, 5);
  });

  it("sin filtros sigue midiendo encontrados, como siempre", () => {
    const suelta = search({ params: { ...search().params, limit: 100 }, found_count: 25 });
    expect(progressOf(suelta)).toBe(0.25);
  });
});

describe("summaryOf con filtros", () => {
  it("dice cuántos de los que pediste llevas, no cuántos son", () => {
    // «18 nuevos» no dice si la búsqueda va bien o va corta.
    const filtrada = search({
      params: { ...search().params, limit: 25, admission: { ...EMPTY_ADMISSION, min_data: 3 } },
      new_count: 18,
      filtered_count: 41,
      duplicate_count: 0,
      rejected_count: 0,
    });
    const resumen = summaryOf(filtrada);
    expect(resumen).toContain("18 de 25 admitidos");
    expect(resumen).toContain("41 fuera del filtro");
  });

  it("los dos motivos de rechazo se dicen con palabras DISTINTAS", () => {
    // `rejected_count` lo vetó el cliente ideal y el lead se guardó;
    // `filtered_count` no pasó el filtro y el lead no existe.
    const ambos = search({
      params: { ...search().params, admission: { ...EMPTY_ADMISSION, min_data: 3 } },
      filtered_count: 7,
      rejected_count: 2,
    });
    const resumen = summaryOf(ambos);
    expect(resumen).toContain("7 fuera del filtro");
    expect(resumen).toContain("2 fuera de tu cliente ideal");
  });
});

describe("admissionSentence", () => {
  it("sin criterios promete todo", () => {
    expect(admissionSentence(EMPTY_ADMISSION, 25, "Restaurantes")).toBe(
      "Guardaré todos los restaurantes que encuentre.",
    );
  });

  it("dice que los exigidos cuentan DENTRO de la cantidad", () => {
    const frase = admissionSentence(
      { ...EMPTY_ADMISSION, min_score: 40, min_data: 3, require: ["instagram"], max_records: 100 },
      25,
      "Restaurantes",
    );
    expect(frase).toContain("calidad 40 o más");
    expect(frase).toContain("al menos 3 de 5 datos");
    expect(frase).toContain("y entre ellos Instagram");
    expect(frase).toContain("hasta encontrar 25");
    expect(frase).toContain("sin pasar de 100 registros");
  });

  it("sin cantidad, el exigido no se cuela dentro de nada", () => {
    const frase = admissionSentence(
      { ...EMPTY_ADMISSION, require: ["instagram"] },
      25,
      "Restaurantes",
    );
    expect(frase).toContain("Instagram");
    expect(frase).not.toContain("entre ellos");
  });
});

describe("admissionChips", () => {
  it("el pliegue no esconde el estado", () => {
    const chips = admissionChips({
      ...EMPTY_ADMISSION,
      min_score: 40,
      min_data: 3,
      require: ["instagram"],
    });
    expect(chips).toEqual(["calidad ≥ 40", "3 de 5 datos", "Instagram"]);
  });

  it("sin criterios no hay chips que enseñar", () => {
    expect(admissionChips({ ...EMPTY_ADMISSION, max_records: 100 })).toEqual([]);
  });
});
