import {
  costOf,
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
    },
    found_count: 25,
    new_count: 20,
    duplicate_count: 4,
    rejected_count: 1,
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
    });
  });
});

describe("queryOf", () => {
  it("resume la búsqueda empezando por la fuente", () => {
    expect(queryOf(search())).toBe("OpenStreetMap · panaderia · Bogotá");
  });
});
