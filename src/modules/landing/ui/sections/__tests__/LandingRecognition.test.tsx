import { render, screen, within } from "@testing-library/react"

import LandingRecognition from "../LandingRecognition"
import { LANDING_ANCHORS, RECOGNITION } from "@/modules/landing/ui/content/landing.content"

/**
 * La isla del reconocimiento tiene dos modos: animada (canvas + fases) y, con
 * `prefers-reduced-motion`, el ESTADO FINAL sin canvas. En jsdom no hay 2D
 * context, así que el efecto sale temprano: aquí se prueba el marcado, no el
 * dibujo — que se ve con `next dev`.
 */
let reducedMotion = false
jest.mock("framer-motion", () => {
  const actual = jest.requireActual<typeof import("framer-motion")>("framer-motion")
  // framer cachea la primera lectura de matchMedia a nivel de módulo, así que
  // se sustituye el hook: es lo que hacen FlowRoute y confetti.
  return { ...actual, useReducedMotion: () => reducedMotion }
})

function mockReducedMotion(matches: boolean) {
  reducedMotion = matches
}

// jsdom no implementa el 2D context y lo anuncia con un console.error por
// render; el componente ya tolera `null` (sale del efecto), así que se acalla.
beforeAll(() => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => null)
})
afterAll(() => {
  jest.restoreAllMocks()
})

describe("LandingRecognition", () => {
  it("es una isla oscura anclada, con el titular y las nueve fichas del catálogo", () => {
    mockReducedMotion(false)
    render(<LandingRecognition />)
    const section = document.getElementById(LANDING_ANCHORS.recognition)
    expect(section).not.toBeNull()
    expect(section?.className).toMatch(/theme-dark-island/)
    expect(screen.getByRole("heading", { level: 2, name: RECOGNITION.title })).toBeInTheDocument()
    const scanner = screen.getByRole("img", { name: RECOGNITION.ariaLabel })
    expect(within(scanner).getAllByRole("listitem", { hidden: true })).toHaveLength(RECOGNITION.catalog.length)
    expect(within(scanner).getByText(RECOGNITION.capture.caption)).toBeInTheDocument()
    expect(within(scanner).getByText(RECOGNITION.reply.text)).toBeInTheDocument()
    expect(scanner.querySelector("canvas")).not.toBeNull()
  })

  it("con movimiento reducido no monta el canvas y deja el estado final a la vista", () => {
    mockReducedMotion(true)
    render(<LandingRecognition />)
    const scanner = screen.getByRole("img", { name: RECOGNITION.ariaLabel })
    expect(scanner.querySelector("canvas")).toBeNull()
    for (const chip of within(scanner).getAllByText(RECOGNITION.chip)) {
      expect(chip.className).toMatch(/opacity-100/)
    }
  })

  it("las fuentes y los hechos vienen del contenido y no venden enlaces pegados", () => {
    mockReducedMotion(false)
    render(<LandingRecognition />)
    for (const source of RECOGNITION.sources) {
      expect(screen.getByRole("heading", { level: 3, name: source.title })).toBeInTheDocument()
    }
    const section = document.getElementById(LANDING_ANCHORS.recognition) as HTMLElement
    expect(section.textContent).not.toMatch(/enlace|\blink\b|\burl\b/i)
    expect(section.textContent).toMatch(/Del reel, la captura/)
  })
})
