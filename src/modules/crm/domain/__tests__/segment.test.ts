import { compactSegmentFilters, describeSegmentFilters, type SegmentFilters, type TagDTO } from "../segment";

const TAGS = [
  { id: "t1", name: "VIP" },
  { id: "t2", name: "Mayorista" },
] as TagDTO[];

/**
 * Blindaje de la extracción del builder (F5 de marketing): `describeSegmentFilters`
 * salía de dentro de `SegmentsManager` y ahora la comparten el CRM y el wizard
 * de campañas. Estos casos fijan que dice EXACTAMENTE lo mismo que decía.
 */
describe("describeSegmentFilters", () => {
  it("describe el DSL completo en el orden acordado", () => {
    const filters: SegmentFilters = {
      lifecycle_stage: ["lead", "customer"],
      source: ["manual"],
      tag_ids: { any: ["t1"], all: ["t2"] },
      city: "Bogotá",
      q: "ana",
      min_score: 50,
      created_after: "2026-01-01T00:00:00.000Z",
      created_before: "2026-06-01T00:00:00.000Z",
      has_open_deal: true,
      last_activity_before: "2026-05-06T00:00:00.000Z",
    };
    expect(describeSegmentFilters(filters, TAGS)).toBe(
      "etapa ∈ [Lead, Cliente] · fuente ∈ [Manual] · alguna etiqueta: VIP · " +
        "todas las etiquetas: Mayorista · ciudad: Bogotá · busca “ana” · score ≥ 50 · " +
        "creados desde 2026-01-01 · creados hasta 2026-06-01 · con oportunidad abierta · " +
        "sin actividad desde 2026-05-06",
    );
  });

  it("sin filtros lo dice explícitamente: son TODOS los contactos", () => {
    expect(describeSegmentFilters({}, TAGS)).toBe("sin filtros (todos los contactos)");
  });

  it("distingue con y sin oportunidad abierta", () => {
    expect(describeSegmentFilters({ has_open_deal: false }, TAGS)).toBe("sin oportunidad abierta");
  });

  it("no se rompe si una etiqueta ya no existe", () => {
    // Un tag borrado deja su id en el segmento guardado: mejor "?" que un crash.
    expect(describeSegmentFilters({ tag_ids: { any: ["borrado"] } }, TAGS)).toBe(
      "alguna etiqueta: ?",
    );
  });

  it("un score de 0 se describe: es un filtro, no una ausencia", () => {
    expect(describeSegmentFilters({ min_score: 0 }, TAGS)).toBe("score ≥ 0");
  });
});

describe("compactSegmentFilters", () => {
  it("descarta arrays vacíos, cadenas en blanco y claves ausentes", () => {
    expect(
      compactSegmentFilters({
        lifecycle_stage: [],
        source: [],
        city: "   ",
        q: "",
        tag_ids: { any: [], all: [] },
      }),
    ).toEqual({});
  });

  it("conserva los valores con significado, incluido el falsy", () => {
    expect(compactSegmentFilters({ min_score: 0, has_open_deal: false })).toEqual({
      min_score: 0,
      has_open_deal: false,
    });
  });

  it("recorta ciudad y búsqueda", () => {
    expect(compactSegmentFilters({ city: " Bogotá ", q: " ana " })).toEqual({
      city: "Bogotá",
      q: "ana",
    });
  });

  it("mantiene solo el lado de tag_ids que trae valores", () => {
    expect(compactSegmentFilters({ tag_ids: { any: ["t1"], all: [] } })).toEqual({
      tag_ids: { any: ["t1"] },
    });
  });

  it("es idempotente", () => {
    const once = compactSegmentFilters({ city: " Bogotá ", lifecycle_stage: ["lead"] });
    expect(compactSegmentFilters(once)).toEqual(once);
  });
});
