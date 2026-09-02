import { render } from "@testing-library/react"

import { BeamsBackground } from "../beams-background"

describe("BeamsBackground", () => {
  it("pinta un canvas decorativo, invisible para lectores de pantalla", () => {
    // jsdom no implementa canvas 2D: el componente debe degradar en silencio.
    const getContext = jest
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockImplementation(() => null)

    const { container } = render(
      <div className="relative isolate">
        <BeamsBackground />
      </div>,
    )

    const canvas = container.querySelector("canvas")
    expect(canvas).not.toBeNull()
    expect(canvas).toHaveAttribute("aria-hidden", "true")
    expect(canvas?.className).toContain("pointer-events-none")
    getContext.mockRestore()
  })
})
