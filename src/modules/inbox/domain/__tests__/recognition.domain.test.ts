import { extractRecognition, parsePreview } from "../inbox"

describe("extractRecognition", () => {
  it("lee payload.recognition con status válido y filtra candidatos malformados", () => {
    const result = extractRecognition({
      media: {},
      recognition: {
        status: "done",
        kind: "product",
        description: "Vestido rojo",
        candidates: [
          { product_id: "p1", sku: "VL-M", name: "Vestido Luna", score: 0.9, confidence: "high" },
          { basura: true },
          null,
        ],
      },
    })
    expect(result?.status).toBe("done")
    expect(result?.candidates).toHaveLength(1)
    expect(result?.candidates?.[0]?.sku).toBe("VL-M")
  })

  it("payload nulo, sin recognition o con status desconocido → null", () => {
    expect(extractRecognition(null)).toBeNull()
    expect(extractRecognition({ media: {} })).toBeNull()
    expect(extractRecognition({ recognition: { status: "pendiente" } })).toBeNull()
    expect(extractRecognition({ recognition: "done" })).toBeNull()
  })

  it("skipped y failed se devuelven tal cual (la burbuja decide no pintar)", () => {
    expect(extractRecognition({ recognition: { status: "skipped", skip_reason: "quota" } })).toEqual({
      status: "skipped",
      skip_reason: "quota",
      candidates: [],
    })
    expect(extractRecognition({ recognition: { status: "failed" } })?.status).toBe("failed")
  })
})

describe("parsePreview — reconocimiento de producto", () => {
  it("«📷 …» es una foto reconocida: icono de imagen y el texto sin el emoji", () => {
    expect(parsePreview("📷 Vestido rojo · ¿Vestido Luna?")).toEqual({
      kind: "image",
      text: "Vestido rojo · ¿Vestido Luna?",
    })
  })

  it("«📎 …» es una publicación compartida de Instagram", () => {
    expect(parsePreview("📎 Publicación compartida")).toEqual({
      kind: "image",
      text: "Publicación compartida",
    })
  })
})
