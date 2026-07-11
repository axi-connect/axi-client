import { extractLocationPayload, parsePreview } from "../inbox"

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
