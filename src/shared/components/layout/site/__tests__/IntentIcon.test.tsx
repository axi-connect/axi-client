/**
 * Los íconos de intención del nav: la pieza correcta del isotipo por intención,
 * el círculo perfecto de «Vender y cobrar», ids de degradado únicos por
 * instancia (el ícono sale en la barra y en el panel a la vez) y decorativos.
 */
import { render } from "@testing-library/react"

import { INTENT_OF, IntentIcon } from "../IntentIcon"
import { SITE_INTENTS } from "../site-nav.content"

it("vender es un círculo completo con su degradado coral, sin cinta", () => {
  const { container } = render(<IntentIcon intent="sell" />)
  const circle = container.querySelector("circle")!
  expect(circle).toHaveAttribute("r", "7")
  expect(circle).toHaveAttribute("fill", "none")
  expect(circle).toHaveAttribute("stroke-width", "4.2")
  expect(container.querySelector("path")).toBeNull()
  const stops = Array.from(container.querySelectorAll("stop")).map((s) => s.getAttribute("stop-color"))
  expect(stops).toEqual(["#FF8A7E", "#E65759"])
})

it.each([
  ["grow", "160 118 256 262", ["#FFD580", "#E39800"]],
  ["attend", "156 120 258 258", ["#C9A6FF", "#7A2EF0"]],
] as const)("%s lleva su cinta del isotipo", (intent, viewBox, colors) => {
  const { container } = render(<IntentIcon intent={intent} />)
  expect(container.querySelector("svg")).toHaveAttribute("viewBox", viewBox)
  expect(container.querySelector("path")).not.toBeNull()
  expect(Array.from(container.querySelectorAll("stop")).map((s) => s.getAttribute("stop-color"))).toEqual(colors)
})

it("tesela compacta de 20 en sm y de 44 en lg (el glifo, 14 y 26)", () => {
  const { container } = render(
    <>
      <IntentIcon intent="sell" size="sm" />
      <IntentIcon intent="sell" size="lg" />
    </>,
  )
  const [sm, lg] = Array.from(container.querySelectorAll<HTMLElement>(".intent-icon"))
  expect(sm.dataset.size).toBe("sm")
  expect(sm.querySelector("svg")).toHaveAttribute("width", "14")
  expect(lg.dataset.size).toBe("lg")
  expect(lg.querySelector("svg")).toHaveAttribute("width", "26")
})

it("cada instancia usa su propio degradado y el ícono es decorativo", () => {
  const { container } = render(
    <>
      <IntentIcon intent="grow" />
      <IntentIcon intent="grow" size="lg" />
    </>,
  )
  const ids = Array.from(container.querySelectorAll("linearGradient")).map((g) => g.id)
  expect(new Set(ids).size).toBe(2)
  for (const [i, path] of Array.from(container.querySelectorAll("path")).entries()) expect(path).toHaveAttribute("fill", `url(#${ids[i]})`)
  container.querySelectorAll(".intent-icon").forEach((el) => expect(el).toHaveAttribute("aria-hidden", "true"))
})

it("toda intención del menú tiene su ícono", () => {
  for (const it of SITE_INTENTS) expect(INTENT_OF[it.id]).toBeDefined()
})
