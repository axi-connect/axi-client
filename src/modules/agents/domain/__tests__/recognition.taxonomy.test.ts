import { taxonomyChangeNote } from "@/modules/agents/domain/recognition"

const result = (overrides: Partial<Parameters<typeof taxonomyChangeNote>[0] & object> = {}) => ({
  vertical: "beauty",
  version: 1,
  created: 0,
  adopted: 0,
  updated: 0,
  retired: 0,
  kept: 0,
  ...overrides,
})

describe("taxonomyChangeNote", () => {
  it("cuenta lo sembrado, lo retirado y lo conservado", () => {
    expect(taxonomyChangeNote(result({ created: 11, adopted: 1, retired: 9, kept: 2 }))).toMatch(
      /^Categorías: 12 categorías nuevas · 9 retiradas del tipo anterior · 2 conservadas porque tienen productos\./,
    )
  })

  it("singular", () => {
    expect(taxonomyChangeNote(result({ created: 1, kept: 1 }))).toMatch(
      /1 categoría nueva · 1 conservada porque tiene productos\./,
    )
  })

  it("sin cambios en el árbol lo dice", () => {
    expect(taxonomyChangeNote(result())).toMatch(/^Las categorías ya estaban al día\./)
  })

  it("sin resultado (no cambió o la siembra falló) queda el aviso de atributos", () => {
    expect(taxonomyChangeNote(null)).toMatch(/^Los atributos de los próximos productos/)
  })
})
