import { render, screen } from "@testing-library/react"

import ComenzarLayout from "../layout"

jest.mock("@/core/analytics/ui/PublicAnalytics", () => ({ PublicAnalytics: () => null }))

describe("ComenzarLayout", () => {
  it("lleva el mismo lockup de marca que la landing y el enlace a iniciar sesión", () => {
    render(
      <ComenzarLayout>
        <p>contenido</p>
      </ComenzarLayout>,
    )

    // Mismo nombre accesible que el header público: el wordmark, sin aria-label propio.
    const brand = screen.getByRole("link", { name: "axi connect" })
    expect(brand).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: /inicia sesión/i })).toHaveAttribute("href", "/auth/login")
    expect(screen.getByText("contenido")).toBeInTheDocument()
  })

  it("monta su propio scroller de marca: `html` no desplaza y el funnel no puede recortarse en pantallas bajas", () => {
    const { container } = render(
      <ComenzarLayout>
        <p>contenido</p>
      </ComenzarLayout>,
    )

    const scroller = container.querySelector("[data-app-scroll]")
    expect(scroller).not.toBeNull()
    expect(scroller).toHaveClass("h-svh", "overflow-y-auto", "sidebar-scroll")
  })
})
