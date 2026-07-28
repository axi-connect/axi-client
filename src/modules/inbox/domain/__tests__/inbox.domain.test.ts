import { extractCatalogSku, extractLocationPayload, extractTranscription, parsePreview } from "../inbox"

describe("parsePreview (tokens de media del backend)", () => {
  it.each([
    ["[image]", "Foto", "image"],
    ["[audio]", "Nota de voz", "audio"],
    ["[video]", "Video", "video"],
    ["[document]", "Documento", "document"],
    ["[sticker]", "Sticker", "sticker"],
    ["[location]", "Ubicación", "location"],
  ])("%s → %s", (token, label, kind) => {
    expect(parsePreview(token)).toEqual({ kind, text: label })
  })

  it("texto normal pasa tal cual, sin icono", () => {
    expect(parsePreview("hola, ¿cómo van?")).toEqual({ kind: null, text: "hola, ¿cómo van?" })
  })

  it("null → puntos suspensivos", () => {
    expect(parsePreview(null)).toEqual({ kind: null, text: "…" })
  })

  it("un token desconocido no rompe (queda como texto)", () => {
    expect(parsePreview("[template]")).toEqual({ kind: null, text: "[template]" })
  })

  it("audio transcrito (🎤 <texto>) → icono audio + texto sin emoji", () => {
    expect(parsePreview("🎤 quiero dos pizzas")).toEqual({ kind: "audio", text: "quiero dos pizzas" })
  })
})

describe("extractTranscription", () => {
  it("transcripción done con texto", () => {
    expect(
      extractTranscription({
        media: { id: "x" },
        transcription: {
          status: "done",
          text: "quiero dos pizzas",
          provider: "groq",
          model: "whisper-large-v3-turbo",
          audio_seconds: 4.2,
          latency_ms: 900,
          transcribed_at: "2026-07-16T00:00:00Z",
        },
      }),
    ).toEqual({
      status: "done",
      text: "quiero dos pizzas",
      provider: "groq",
      model: "whisper-large-v3-turbo",
      audio_seconds: 4.2,
      latency_ms: 900,
      transcribed_at: "2026-07-16T00:00:00Z",
    })
  })

  it("transcripción failed (sin texto)", () => {
    expect(extractTranscription({ transcription: { status: "failed" } })).toEqual({ status: "failed" })
  })

  it("payload sin transcripción o malformado → null", () => {
    expect(extractTranscription(null)).toBeNull()
    expect(extractTranscription({})).toBeNull()
    expect(extractTranscription({ transcription: { status: "pending" } })).toBeNull()
    expect(extractTranscription({ transcription: { status: "done" } })).toBeNull() // done sin text
  })
})

describe("extractLocationPayload", () => {
  it("payload válido del backend", () => {
    expect(
      extractLocationPayload({ location: { latitude: 4.6, longitude: -74.08, address: "Cra 7" } }),
    ).toEqual({ latitude: 4.6, longitude: -74.08, name: undefined, address: "Cra 7" })
  })

  it("payload malformado → null (no revienta el render)", () => {
    expect(extractLocationPayload(null)).toBeNull()
    expect(extractLocationPayload({})).toBeNull()
    expect(extractLocationPayload({ location: { latitude: "4.6" } })).toBeNull()
  })
})

describe("extractCatalogSku (foto de catálogo enviada por la IA, F16)", () => {
  it("payload con media.catalog_sku → sku", () => {
    expect(extractCatalogSku({ media: { catalog_sku: "CAM-R-M" } })).toBe("CAM-R-M")
  })

  it("payload sin sku o malformado → null (no revienta el render)", () => {
    expect(extractCatalogSku(null)).toBeNull()
    expect(extractCatalogSku({})).toBeNull()
    expect(extractCatalogSku({ media: {} })).toBeNull()
    expect(extractCatalogSku({ media: { catalog_sku: 42 } })).toBeNull()
    expect(extractCatalogSku({ media: { catalog_sku: "  " } })).toBeNull()
  })
})
