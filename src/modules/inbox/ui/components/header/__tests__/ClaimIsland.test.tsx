import { fireEvent, render, screen } from "@testing-library/react"
import { Hand } from "lucide-react"
import { ClaimIsland } from "../ClaimIsland"

const action = (onSelect = jest.fn()) => ({ id: "claim", label: "Atender", icon: Hand, onSelect })

describe("ClaimIsland — «Atender» como isla en la cabecera", () => {
  it("dice quién la pasó y hace cuánto, lleva el motivo en su nombre y en el title, y Atender la toma", () => {
    const onSelect = jest.fn()
    render(<ClaimIsland action={action(onSelect)} reason="El cliente pidió hablar con una persona." since="14 min" busy={false} />)
    const island = screen.getByRole("group", { name: "Axi te la pasó: El cliente pidió hablar con una persona. · hace 14 min" })
    expect(island).toHaveAttribute("title", "El cliente pidió hablar con una persona.")
    expect(island).toHaveTextContent("14 min")
    fireEvent.click(screen.getByRole("button", { name: "Atender" }))
    expect(onSelect).toHaveBeenCalled()
  })

  it("sin motivo ni hora todavía: igual ofrece Atender; ocupada, lo deshabilita", () => {
    render(<ClaimIsland action={action()} reason={null} since={null} busy />)
    expect(screen.getByRole("group", { name: "Axi te la pasó" })).not.toHaveAttribute("title")
    expect(screen.getByRole("button", { name: "Atender" })).toBeDisabled()
  })
})
