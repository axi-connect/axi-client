import { act, render, screen } from "@testing-library/react"
import { createRef } from "react"

import { Confetti, brandCelebration, type ConfettiApi } from "../confetti"

let reduced = false
jest.mock("framer-motion", () => ({ useReducedMotion: () => reduced }))

const instance = Object.assign(jest.fn(), { reset: jest.fn() })
const create = jest.fn((_canvas: unknown, _options: unknown) => instance)
jest.mock("canvas-confetti", () => ({ __esModule: true, default: { create: (canvas: unknown, options: unknown) => create(canvas, options) } }))

async function flushImport() {
  // El import diferido de canvas-confetti resuelve en microtareas.
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("Confetti", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    reduced = false
  })
  afterEach(() => jest.useRealTimers())

  it("crea la instancia sobre su canvas al primer disparo y respeta el instante de cada tiro", async () => {
    const ref = createRef<ConfettiApi>()
    render(<Confetti ref={ref} />)
    const canvas = screen.getByTestId("confetti-canvas")
    expect(create).not.toHaveBeenCalled()

    ref.current?.fire([
      { particleCount: 4, at: 0 },
      { particleCount: 8, at: 300 },
    ])
    await flushImport()

    expect(create).toHaveBeenCalledWith(canvas, { resize: true, useWorker: true })
    act(() => jest.advanceTimersByTime(0))
    expect(instance).toHaveBeenCalledTimes(1)
    expect(instance).toHaveBeenCalledWith({ particleCount: 4 })
    act(() => jest.advanceTimersByTime(300))
    expect(instance).toHaveBeenCalledTimes(2)
    expect(instance).toHaveBeenLastCalledWith({ particleCount: 8 })
  })

  it("al desmontar cancela los tiros pendientes y limpia el canvas", async () => {
    const ref = createRef<ConfettiApi>()
    const { unmount } = render(<Confetti ref={ref} />)
    ref.current?.fire([{ at: 0 }, { at: 2000 }])
    await flushImport()
    act(() => jest.advanceTimersByTime(0))
    expect(instance).toHaveBeenCalledTimes(1)

    unmount()
    act(() => jest.advanceTimersByTime(5000))
    expect(instance).toHaveBeenCalledTimes(1)
    expect(instance.reset).toHaveBeenCalledTimes(1)
  })

  it("con prefers-reduced-motion no pinta canvas y disparar no hace nada", async () => {
    reduced = true
    const ref = createRef<ConfettiApi>()
    render(<Confetti ref={ref} />)
    expect(screen.queryByTestId("confetti-canvas")).not.toBeInTheDocument()

    ref.current?.fire([{ at: 0 }])
    await flushImport()
    act(() => jest.advanceTimersByTime(100))
    expect(create).not.toHaveBeenCalled()
    expect(instance).not.toHaveBeenCalled()
  })
})

describe("brandCelebration", () => {
  const colors = ["rgb(1, 2, 3)", "rgb(4, 5, 6)", "rgb(7, 8, 9)"]

  it("es una ráfaga finita: cañones desde ambos bordes y un estallido central, todo con los colores de marca", () => {
    const shots = brandCelebration(colors)
    const last = Math.max(...shots.map((shot) => shot.at ?? 0))

    expect(last).toBeLessThan(2500)
    expect(shots.every((shot) => shot.colors?.join() === colors.join())).toBe(true)
    expect(shots.filter((shot) => shot.origin?.x === 0)).toHaveLength(shots.filter((shot) => shot.origin?.x === 1).length)
    expect(shots.filter((shot) => shot.origin?.x === 0.5)).toHaveLength(1)
  })

  it("no muta la paleta recibida", () => {
    const input = [...colors]
    brandCelebration(input)
    expect(input).toEqual(colors)
  })
})
