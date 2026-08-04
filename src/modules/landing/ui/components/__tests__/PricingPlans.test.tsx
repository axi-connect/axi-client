import { fireEvent, render, screen, within } from "@testing-library/react"

import { PricingPlans } from "../PricingPlans"

function selectVolume(label: string) {
  fireEvent.click(screen.getByRole("radio", { name: label }))
}

describe("PricingPlans", () => {
  it("arranca en 'Desde' con el tramo de entrada y el descuento de fundador", () => {
    render(<PricingPlans />)
    const sbs = within(screen.getByTestId("plan-sbs"))

    expect(sbs.getByText("Desde")).toBeInTheDocument()
    expect(sbs.getByText("$250.000")).toBeInTheDocument()
    expect(sbs.getByText("$150.000")).toBeInTheDocument()
    expect(sbs.getByText("Hasta 300 conversaciones/mes")).toBeInTheDocument()
    expect(sbs.getByText("−40 % precio fundador")).toBeInTheDocument()
  })

  it("cambia precio, tachado y bullet de volumen al elegir un tramo", () => {
    render(<PricingPlans />)
    selectVolume("300 a 3.000")
    const sbs = within(screen.getByTestId("plan-sbs"))

    expect(sbs.getByText("$850.000")).toBeInTheDocument()
    expect(sbs.getByText("$510.000")).toBeInTheDocument()
    expect(sbs.getByText("Hasta 3.000 conversaciones/mes")).toBeInTheDocument()
    // Con tramo elegido el precio deja de ser aproximado
    expect(sbs.queryByText("Desde")).not.toBeInTheDocument()
  })

  it("mueve el sello 'Tu plan' a Enterprise sin quitarle 'Most popular' a SBS", () => {
    render(<PricingPlans />)

    selectVolume("Menos de 300")
    expect(within(screen.getByTestId("plan-sbs")).getByText("Tu plan")).toBeInTheDocument()

    selectVolume("Más de 3.000")
    expect(within(screen.getByTestId("plan-enterprise")).getByText("Tu plan")).toBeInTheDocument()

    const sbs = within(screen.getByTestId("plan-sbs"))
    expect(sbs.queryByText("Tu plan")).not.toBeInTheDocument()
    expect(sbs.getByText("Most popular")).toBeInTheDocument()
    // Sin tramo aplicable, SBS vuelve a su precio de entrada aproximado
    expect(sbs.getByText("Desde")).toBeInTheDocument()
  })

  it("no recomienda ningún plan mientras el visitante no declare su volumen", () => {
    render(<PricingPlans />)
    expect(screen.queryByText("Tu plan")).not.toBeInTheDocument()
  })

  it("lleva los tres planes al mismo destino de conversión", () => {
    render(<PricingPlans />)
    const ctas = ["Empieza tus 7 días gratis", "Reclama tu cupo fundador", "Hablemos"]

    for (const label of ctas) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", "#demo")
    }
  })

  it("publica el estado real de los cupos y la fecha de cierre", () => {
    render(<PricingPlans />)

    expect(screen.getByText("13")).toBeInTheDocument()
    expect(screen.getByText("de 20 tomados")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "13")
    expect(screen.getByText(/Hasta el 31 de octubre de 2026/)).toBeInTheDocument()
  })
})
