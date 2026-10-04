/**
 * La ruleta del riel (lienzo «Landing · Riel temario» v2): se abre desde el
 * riel, la rueda y las flechas mueven la selección (y no la página), Intro
 * inicia el recorrido a la escena del centro y Esc cierra devolviendo el foco.
 */
import { act, fireEvent, render, screen } from "@testing-library/react"

import { RAIL_INDEX } from "@/modules/landing/domain/film/rail-index"
import { FilmDrum } from "../parts/FilmDrum"

const ENTRIES = RAIL_INDEX
const centered = () => document.querySelector<HTMLButtonElement>(".film-drum-row[data-centered]")!

beforeAll(() => {
  window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
    cb(0)
    return 0
  }) as typeof window.requestAnimationFrame
})

function drum(current = 9) {
  const onTravel = jest.fn()
  render(<FilmDrum entries={ENTRIES} current={current} onTravel={onTravel} />)
  return { onTravel, trigger: screen.getByRole("button", { name: "Ir a una escena" }) }
}

it("cerrada es inerte; con el teclado se abre en la escena actual y el foco entra a ella", () => {
  const { trigger } = drum(9)
  const nav = screen.getByRole("navigation", { hidden: true })
  expect(nav).toHaveAttribute("inert")
  fireEvent.keyDown(trigger, { key: "ArrowDown" })
  expect(nav).not.toHaveAttribute("inert")
  expect(trigger).toHaveAttribute("aria-expanded", "true")
  expect(centered().textContent).toContain(ENTRIES[9].title)
  expect(document.activeElement).toBe(centered())
})

it("la rueda gira la ruleta a pasos de 60 px y no deja pasar el scroll a la página", () => {
  const { trigger } = drum(9)
  fireEvent.mouseEnter(trigger.parentElement!)
  const zone = document.querySelector(".film-drum-zone")!
  // 30 px no llegan a un paso; con 40 más, uno.
  const first = new WheelEvent("wheel", { deltaY: 30, bubbles: true, cancelable: true })
  act(() => {
    zone.dispatchEvent(first)
  })
  expect(first.defaultPrevented).toBe(true)
  expect(centered().textContent).toContain(ENTRIES[9].title)
  act(() => {
    zone.dispatchEvent(new WheelEvent("wheel", { deltaY: 40, bubbles: true, cancelable: true }))
  })
  expect(centered().textContent).toContain(ENTRIES[10].title)
  // Y hacia arriba.
  act(() => {
    zone.dispatchEvent(new WheelEvent("wheel", { deltaY: -130, bubbles: true, cancelable: true }))
  })
  expect(centered().textContent).toContain(ENTRIES[8].title)
})

it("↑ ↓ mueven la selección; Intro viaja a la del centro; Esc cierra y devuelve el foco", () => {
  const { trigger, onTravel } = drum(4)
  fireEvent.keyDown(trigger, { key: "Enter" })
  fireEvent.keyDown(centered(), { key: "ArrowDown" })
  fireEvent.keyDown(centered(), { key: "ArrowDown" })
  expect(centered().textContent).toContain(ENTRIES[6].title)
  fireEvent.keyDown(centered(), { key: "Enter" })
  expect(onTravel).toHaveBeenCalledWith(ENTRIES[6])
  // Otra vez abierta: Esc cierra y el foco vuelve al riel, sin viajar.
  fireEvent.keyDown(trigger, { key: "ArrowUp" })
  fireEvent.keyDown(centered(), { key: "Escape" })
  expect(trigger).toHaveAttribute("aria-expanded", "false")
  expect(document.activeElement).toBe(trigger)
  expect(onTravel).toHaveBeenCalledTimes(1)
})

it("la escena actual lleva aria-current; un clic en otra la trae al centro sin viajar", () => {
  const { trigger, onTravel } = drum(3)
  fireEvent.mouseEnter(trigger.parentElement!)
  expect(document.querySelector('[aria-current="step"]')?.textContent).toContain(ENTRIES[3].title)
  fireEvent.click(document.querySelector<HTMLButtonElement>('.film-drum-row[data-index="4"]')!)
  expect(onTravel).not.toHaveBeenCalled()
  expect(centered().textContent).toContain(ENTRIES[4].title)
})

it("abierta por hover, ↑ ↓ e Intro funcionan sin tabular; cerrada, las flechas son de la página", () => {
  const { trigger, onTravel } = drum(5)
  // Signo 1: cerrada, una flecha en la página no la mueve ni se la queda.
  const closed = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })
  act(() => {
    document.body.dispatchEvent(closed)
  })
  expect(closed.defaultPrevented).toBe(false)
  expect(trigger).toHaveAttribute("aria-expanded", "false")
  // Signo 2: abierta por hover (foco fuera), ↓ ↓ giran e Intro viaja.
  fireEvent.mouseEnter(trigger.parentElement!)
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }))
  })
  expect(centered().textContent).toContain(ENTRIES[7].title)
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
  })
  expect(onTravel).toHaveBeenCalledWith(ENTRIES[7])
  expect(trigger).toHaveAttribute("aria-expanded", "false")
  // Y Esc la cierra sin viajar.
  fireEvent.mouseEnter(trigger.parentElement!)
  act(() => {
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
  })
  expect(trigger).toHaveAttribute("aria-expanded", "false")
  expect(onTravel).toHaveBeenCalledTimes(1)
})
