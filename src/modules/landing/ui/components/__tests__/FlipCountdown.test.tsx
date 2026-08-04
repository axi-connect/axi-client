import { act, render, screen, within } from "@testing-library/react"

import { FlipCountdown, FlipTile } from "../FlipCountdown"

const DEADLINE = "2026-10-31"

/** Lee las cifras visibles de las cuatro fichas (días, horas, min, seg). */
function tiles(container: HTMLElement) {
  return Array.from(container.querySelectorAll(".glass-flat")).map(
    (tile) => tile.querySelector("div > div")?.textContent ?? "",
  )
}

describe("FlipCountdown", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("descompone el tiempo restante hasta el final del día de cierre", () => {
    // El cierre es a las 23:59:59 del 31: desde el 28 a las 18:00 quedan
    // 3 días, 5 horas, 59 minutos y 59 segundos.
    jest.setSystemTime(new Date("2026-10-28T18:00:00"))
    const { container } = render(
      <FlipCountdown deadline={DEADLINE} deadlineLabel="31 de octubre" />,
    )

    expect(tiles(container)).toEqual(["03", "05", "59", "59"])
  })

  it("avanza el segundero con cada tick del reloj", () => {
    jest.setSystemTime(new Date("2026-10-28T18:00:00"))
    const { container } = render(
      <FlipCountdown deadline={DEADLINE} deadlineLabel="31 de octubre" />,
    )

    // advanceTimersByTime mueve también el reloj simulado: no hay que tocar
    // setSystemTime además, o se avanzarían dos segundos.
    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // Un segundo menos: 3d 5h 59m 58s
    expect(tiles(container)).toEqual(["03", "05", "59", "58"])
  })

  it("queda en ceros cuando la fecha ya pasó, sin cifras negativas", () => {
    jest.setSystemTime(new Date("2026-11-05T10:00:00"))
    const { container } = render(
      <FlipCountdown deadline={DEADLINE} deadlineLabel="31 de octubre" />,
    )

    expect(tiles(container)).toEqual(["00", "00", "00", "00"])
  })

  it("oculta las fichas al lector de pantalla y deja una frase legible", () => {
    jest.setSystemTime(new Date("2026-10-28T18:00:00"))
    const { container } = render(
      <FlipCountdown deadline={DEADLINE} deadlineLabel="31 de octubre" />,
    )

    expect(container.querySelector("[aria-hidden]")).not.toBeNull()
    // Sin aria-live: informa al recorrer la sección, no se anuncia cada segundo.
    expect(container.querySelector("[aria-live]")).toBeNull()
    expect(
      screen.getByText("La oferta de fundadores cierra el 31 de octubre; quedan 3 días."),
    ).toBeInTheDocument()
  })

  it("limpia el intervalo al desmontar", () => {
    jest.setSystemTime(new Date("2026-10-28T18:00:00"))
    const { unmount } = render(
      <FlipCountdown deadline={DEADLINE} deadlineLabel="31 de octubre" />,
    )

    unmount()
    expect(jest.getTimerCount()).toBe(0)
  })
})

describe("FlipTile", () => {
  it("muestra guiones mientras no hay reloj, sin cambiar de tamaño", () => {
    const { container } = render(<FlipTile value={null} label="seg" />)

    // Dos: la mitad de arriba y la de abajo, que juntas componen la cifra.
    expect(within(container).getAllByText("––")).toHaveLength(2)
    expect(container.querySelector(".glass-flat")).toBeInTheDocument()
  })

  it("no usa el glass con backdrop-filter", () => {
    const { container } = render(<FlipTile value="42" label="seg" />)
    const tile = container.querySelector(".glass-flat")

    // Regresión: dentro de la tarjeta con tilt, `.glass` desatura la ficha y
    // recalcular su blur por frame congela el reloj mientras hay hover.
    expect(tile).not.toBeNull()
    expect(tile?.classList.contains("glass")).toBe(false)
  })

  it("no dobla la primera cifra real: sustituye el placeholder de golpe", () => {
    const { container, rerender } = render(<FlipTile value={null} label="seg" />)
    rerender(<FlipTile value="42" label="seg" />)

    // Solo las dos mitades estáticas; ninguna hoja en movimiento.
    expect(container.querySelectorAll(".animate-flip-top")).toHaveLength(0)
    expect(container.querySelectorAll(".animate-flip-bottom")).toHaveLength(0)
  })

  it("monta las dos hojas del split-flap al cambiar de valor", () => {
    const { container, rerender } = render(<FlipTile value="42" label="seg" />)
    rerender(<FlipTile value="43" label="seg" />)

    const top = container.querySelector(".animate-flip-top")
    const bottom = container.querySelector(".animate-flip-bottom")
    expect(top).not.toBeNull()
    expect(bottom).not.toBeNull()
    // La hoja que se dobla lleva el valor viejo; la que sube, el nuevo.
    expect(top?.textContent).toBe("42")
    expect(bottom?.textContent).toBe("43")
  })
})
