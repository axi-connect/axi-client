import {
  applyEdits,
  commitableCount,
  confidenceTone,
  excludeIncomplete,
  filterItems,
  importPollInterval,
  importProgressLabel,
  patchesFor,
  reviewBlockers,
  validateImportFile,
  type CatalogImportDTO,
  type CatalogImportItemDTO,
} from "../catalog-import"

const item = (overrides: Partial<CatalogImportItemDTO>): CatalogImportItemDTO => ({
  id: "i1",
  status: "ready",
  name: "Hamburguesa",
  description: null,
  price_cents: 2490000,
  currency: "COP",
  category: "Platos",
  kind: "product",
  duration_minutes: null,
  variants: [],
  image_urls: [],
  confidence: 0.95,
  source_ref: "Fila 4",
  missing_fields: [],
  duplicate_of_product_id: null,
  ...overrides,
})

describe("archivo", () => {
  it("acepta hojas, PDF e imágenes hasta 10 MB y rechaza el resto con motivo", () => {
    expect(validateImportFile({ name: "menu.xlsx", size: 1000 })).toBeNull()
    expect(validateImportFile({ name: "CARTA.PDF", size: 1000 })).toBeNull()
    expect(validateImportFile({ name: "foto.jpeg", size: 1000 })).toBeNull()
    expect(validateImportFile({ name: "lista.docx", size: 1000 })).toMatch(/formato/i)
    expect(validateImportFile({ name: "menu.xlsx", size: 11 * 1024 * 1024 })).toMatch(/10 MB/)
    expect(validateImportFile({ name: "menu.csv", size: 0 })).toMatch(/vacío/)
  })
})

describe("sondeo del job", () => {
  it("pregunta cada 2 s, luego cada 5 s y se rinde a los 3 min", () => {
    expect(importPollInterval(0)).toBe(2000)
    expect(importPollInterval(59_999)).toBe(2000)
    expect(importPollInterval(60_000)).toBe(5000)
    expect(importPollInterval(180_000)).toBe(false)
  })

  it("describe el progreso en español según el estado", () => {
    const base = { pages_total: 10, pages_processed: 3, items_total: 26, items_created: 0 } as CatalogImportDTO
    expect(importProgressLabel({ ...base, status: "parsing" })).toBe("Leyendo página 3 de 10")
    expect(importProgressLabel({ ...base, status: "extracting" })).toBe("26 productos encontrados hasta ahora")
    expect(importProgressLabel({ ...base, status: "completed", items_created: 37 })).toBe("Creamos 37 productos")
  })
})

describe("revisión", () => {
  const items = [
    applyEdits(item({ id: "ok" }), undefined),
    applyEdits(item({ id: "noprice", price_cents: null, status: "missing_fields", missing_fields: ["price_cents"] }), undefined),
    applyEdits(item({ id: "low", confidence: 0.5 }), undefined),
    applyEdits(item({ id: "dup", duplicate_of_product_id: "p9", status: "duplicate" }), undefined),
  ]

  it("lee la confianza por fila: listo, revisar, falta dato, duplicado, excluido", () => {
    expect(confidenceTone(items[0])).toBe("ready")
    expect(confidenceTone(items[1])).toBe("missing")
    expect(confidenceTone(items[2])).toBe("review")
    expect(confidenceTone(items[3])).toBe("excluded") // duplicado nace no incluido
    expect(confidenceTone(applyEdits(item({ id: "dup2", duplicate_of_product_id: "p9" }), { included: true }))).toBe("duplicate")
  })

  it("bloquea el commit solo por las incluidas sin precio o nombre", () => {
    expect(reviewBlockers(items).map((i) => i.id)).toEqual(["noprice"])
    expect(commitableCount(items)).toBe(2)
    const edits = excludeIncomplete(items, {})
    expect(edits.noprice).toEqual({ included: false })
  })

  it("filtra por lo que falta y por lo listo", () => {
    expect(filterItems(items, "needs_input").map((i) => i.id)).toEqual(["noprice"])
    expect(filterItems(items, "ready").map((i) => i.id)).toEqual(["ok", "low"])
    expect(filterItems(items, "all")).toHaveLength(4)
  })

  it("solo manda al servidor lo que cambió", () => {
    const server = [item({ id: "a", price_cents: null }), item({ id: "b" }), item({ id: "c", status: "excluded" })]
    const patches = patchesFor(server, {
      a: { price_cents: 950000 },
      b: { name: "Hamburguesa", included: false },
      c: { included: true },
    })
    expect(patches).toEqual([
      { item_id: "a", patch: { price_cents: 950000 } },
      { item_id: "b", patch: { status: "excluded" } },
      { item_id: "c", patch: { status: "ready" } },
    ])
  })
})
