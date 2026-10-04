/**
 * La bóveda (plan §13): el cupón impreso bajo la etiqueta dice lo mismo que la
 * respuesta de Axi. Nada se inventa: el código o la regla, la nota y el total
 * salen de `vault.answer`, y el −10 % cuadra con el precio del catálogo.
 */
import { FILM_CONTENT } from "../film-content"
import { FILM_NICHES } from "../niches"
import { VAULT_RECEIPTS } from "../tanda3-content"

const digits = (s: string) => Number(s.replace(/[^\d]/g, ""))
const norm = (s: string) => s.toLowerCase().replace(/ /g, " ")

describe("el cupón de la bóveda", () => {
  it.each(FILM_NICHES)("%s: el código (o la regla) y el total salen de la respuesta", (niche) => {
    const receipt = VAULT_RECEIPTS[niche]
    const answer = norm(FILM_CONTENT[niche].vault.answer)
    const code = norm(receipt.line.replace(/^Cupón\s+/, ""))
    expect(answer).toContain(code)
    expect(answer).toContain(norm(receipt.total))
  })

  it.each(FILM_NICHES)("%s: la nota es un descuento que cuadra o una frase de la respuesta", (niche) => {
    const receipt = VAULT_RECEIPTS[niche]
    const c = FILM_CONTENT[niche]
    const percent = receipt.note.match(/^−(\d+) %$/)
    if (percent) {
      const price = digits(c.photo.catalog[c.photo.matchIndex].price)
      expect(Math.round(price * (1 - Number(percent[1]) / 100))).toBe(digits(receipt.total))
    } else {
      expect(norm(c.vault.answer)).toContain(norm(receipt.note))
    }
  })
})
