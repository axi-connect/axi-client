import { render, screen } from "@testing-library/react"

import { BrandLockup } from "../brand-lockup"

describe("BrandLockup", () => {
  it("es un enlace al inicio cuyo nombre accesible es el wordmark visible", () => {
    render(<BrandLockup />)

    const link = screen.getByRole("link", { name: "axi connect" })
    expect(link).toHaveAttribute("href", "/")
    // El isotipo es decorativo: el nombre lo da el wordmark, no un aria-label.
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(link).not.toHaveAttribute("aria-label")
  })

  it("mismo lockup en dos tamaños: el wordmark nunca baja de text-lg", () => {
    const { rerender } = render(<BrandLockup />)
    // `text-brand-wordmark` y no `text-brand-gradient`: el logo es blanco en
    // oscuro y coral en claro, mientras el degradado suelto sigue siendo coral
    // en los dos temas donde se usa como titular.
    expect(screen.getByText("axi connect")).toHaveClass("text-xl", "text-brand-wordmark", "font-heading")
    expect(screen.getByRole("link").querySelector("svg")).toHaveClass("size-8")

    rerender(<BrandLockup size="sm" />)
    expect(screen.getByText("axi connect")).toHaveClass("text-lg")
    expect(screen.getByRole("link").querySelector("svg")).toHaveClass("size-7")
  })
})
