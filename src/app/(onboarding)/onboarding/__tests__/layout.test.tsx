import { render, screen } from "@testing-library/react"

import OnboardingLayout from "../layout"

jest.mock("@/core/providers/app-ready-signal", () => ({ AppReadySignal: () => null }))

describe("OnboardingLayout", () => {
  it("lleva el lockup de marca y la salida al panel; el progreso ya está guardado, salir nunca pierde nada", () => {
    render(
      <OnboardingLayout>
        <p>contenido</p>
      </OnboardingLayout>,
    )

    expect(screen.getByRole("link", { name: "axi connect" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: /salir al panel/i })).toHaveAttribute("href", "/dashboard")
    expect(screen.getByText("contenido")).toBeInTheDocument()
  })

  it("monta su propio scroller sobre el suelo «Flow»: `html` no desplaza y el onboarding no puede recortarse en pantallas bajas", () => {
    const { container } = render(
      <OnboardingLayout>
        <p>contenido</p>
      </OnboardingLayout>,
    )

    const scroller = container.querySelector("[data-app-scroll]")
    expect(scroller).not.toBeNull()
    expect(scroller).toHaveClass("flow-ground", "h-svh", "overflow-y-auto", "sidebar-scroll", "isolate")
  })
})
