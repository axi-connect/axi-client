/**
 * Un pilar fuera de cuadro sale del teclado pero NO del lector (auditoría
 * ronda 2, R2): antes `inert` borraba del árbol de accesibilidad su h3 y su texto.
 */
import { untabbable } from "../film-kit"

function pillar() {
  document.body.innerHTML = `
    <div id="copy">
      <h3 id="progreso-0">Capta</h3>
      <p>Cuerpo</p>
      <a href="/captar">Ver «Captar»</a>
      <span tabindex="0">propio</span>
    </div>`
  return document.getElementById("copy")!
}

it("fuera de cuadro: el enlace sale de la tabulación y el pilar sigue en el árbol", () => {
  const copy = pillar()
  untabbable(copy, true)
  const link = copy.querySelector("a")!
  expect(link.tabIndex).toBe(-1)
  expect(copy.querySelector("span")!.tabIndex).toBe(-1)
  expect(copy.hasAttribute("inert")).toBe(false)
  expect(copy.closest("[inert],[aria-hidden='true']")).toBeNull()
  expect(document.getElementById("progreso-0")!.textContent).toBe("Capta")
  // Dos veces seguidas no pierde el tabindex original.
  untabbable(copy, true)
  untabbable(copy, false)
  expect(copy.querySelector("span")!.getAttribute("tabindex")).toBe("0")
})

it("en cuadro: todo vuelve a su tabulación de antes", () => {
  const copy = pillar()
  untabbable(copy, true)
  untabbable(copy, false)
  expect(copy.querySelector("a")!.hasAttribute("tabindex")).toBe(false)
  expect(copy.querySelector("a")!.tabIndex).toBe(0)
  expect(copy.querySelector("span")!.getAttribute("tabindex")).toBe("0")
  // Sin haberlo apagado, encenderlo no toca nada.
  const fresh = pillar()
  untabbable(fresh, false)
  expect(fresh.querySelector("a")!.hasAttribute("tabindex")).toBe(false)
})
