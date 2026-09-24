import { act, render } from "@testing-library/react"
import { sileo, Toaster } from "sileo"

/**
 * Contrato con sileo 0.1.5 que NO está en sus tipos y del que depende la
 * decisión D3 (errores y advertencias se apilan). Si una versión nueva deja de
 * leer `id` en las opciones, este test lo dice antes que un usuario que pierde
 * un error. Ver docs/plans/notificaciones_sileo_plan.md §Riesgos.
 */

beforeAll(() => {
  class RO {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  ;(globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO
})

afterEach(() => {
  act(() => sileo.clear())
})

const count = (container: HTMLElement) => container.ownerDocument.querySelectorAll("[data-sileo-toast]").length

describe("sileo 0.1.5", () => {
  it("sin id, un aviso nuevo ocupa la ranura del anterior", () => {
    const { container } = render(<Toaster position="top-center" />)
    act(() => {
      sileo.success({ title: "Uno" })
      sileo.success({ title: "Dos" })
    })
    expect(count(container)).toBe(1)
  })

  it("con id propio, los avisos se apilan", () => {
    const { container } = render(<Toaster position="top-center" />)
    act(() => {
      sileo.error({ title: "Uno", id: "a" } as Parameters<typeof sileo.error>[0])
      sileo.error({ title: "Dos", id: "b" } as Parameters<typeof sileo.error>[0])
    })
    expect(count(container)).toBe(2)
  })
})
