import {
  areaChipLabel,
  grantedScopes,
  initialChoices,
  initials,
  type ConsentScope,
} from "../connected-apps"

const scopes: ConsentScope[] = [
  { scope: "catalogo:escribir", toolset: "catalogo", title: "Catálogo", summary: "", level: "escribir" },
  { scope: "pedidos:leer", toolset: "pedidos", title: "Pedidos", summary: "", level: "leer" },
]

describe("apps conectadas: dominio", () => {
  it("de entrada se concede exactamente lo pedido", () => {
    const choices = initialChoices(scopes)
    expect(choices).toEqual({ catalogo: "escribir", pedidos: "leer" })
    expect(grantedScopes(scopes, choices)).toEqual(["catalogo:escribir", "pedidos:leer"])
  })

  it("bajar a ver o quitar un área recorta los alcances", () => {
    expect(grantedScopes(scopes, { catalogo: "leer", pedidos: "no" })).toEqual(["catalogo:leer"])
    expect(grantedScopes(scopes, { catalogo: "no", pedidos: "no" })).toEqual([])
  })

  it("nunca sube de lo pedido aunque llegue una elección mayor", () => {
    expect(grantedScopes(scopes, { catalogo: "escribir", pedidos: "escribir" })).toEqual([
      "catalogo:escribir",
      "pedidos:leer",
    ])
  })

  it("etiquetas e iniciales", () => {
    expect(areaChipLabel({ title: "Catálogo e inventario", level: "escribir" })).toBe(
      "Catálogo e inventario · ver y cambiar",
    )
    expect(areaChipLabel({ title: "Pedidos", level: "leer" })).toBe("Pedidos · ver")
    expect(initials("Camila Pérez")).toBe("CP")
    expect(initials("  Ana  ")).toBe("A")
  })
})
