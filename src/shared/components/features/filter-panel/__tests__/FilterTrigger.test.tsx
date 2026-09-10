import { render, screen } from "@testing-library/react"
import { FilterTrigger } from "../FilterTrigger"

describe("FilterTrigger compact", () => {
  it("mantiene el nombre accesible con el número y pinta el contador", () => {
    render(<FilterTrigger compact count={2} onClick={() => {}} />)
    expect(screen.getByRole("button", { name: "Filtros (2 activos)" })).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })
  it("sin filtros: solo «Filtros», sin píldora", () => {
    render(<FilterTrigger compact count={0} onClick={() => {}} />)
    expect(screen.getByRole("button", { name: "Filtros" })).toBeInTheDocument()
    expect(screen.queryByText("0")).not.toBeInTheDocument()
  })
})
