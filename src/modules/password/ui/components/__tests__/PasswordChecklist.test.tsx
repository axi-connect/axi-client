import { fireEvent, render, screen } from "@testing-library/react"
import { FormProvider, useForm } from "react-hook-form"
import { PasswordChecklist } from "../PasswordChecklist"

function Harness() {
  const form = useForm({ defaultValues: { new_password: "", confirm_password: "" } })
  return (
    <FormProvider {...form}>
      <input aria-label="nueva" {...form.register("new_password")} />
      <input aria-label="repetir" {...form.register("confirm_password")} />
      <PasswordChecklist />
    </FormProvider>
  )
}

const rule = (text: RegExp) => screen.getByText(text).closest("li") as HTMLElement

describe("PasswordChecklist", () => {
  it("vacía: las tres reglas pendientes", () => {
    render(<Harness />)
    expect(rule(/12 caracteres o más/)).toHaveTextContent("pendiente")
    expect(rule(/Una frase/)).toHaveTextContent("pendiente")
    expect(rule(/Las dos coinciden/)).toHaveTextContent("pendiente")
  })

  it("corta: muestra el conteo, que no se anuncia; el resumen dice cuántas cumple", () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText("nueva"), { target: { value: "corta" } })
    expect(rule(/12 caracteres o más/)).toHaveTextContent("van 5")
    expect(screen.getByText("van 5", { exact: false }).closest("[aria-hidden='true']")).not.toBeNull()
    expect(screen.getByText(/Cumple 0 de 3/)).toBeInTheDocument()
  })

  it("frase larga y repetida: cumple las tres", () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText("nueva"), { target: { value: "pan caliente cada mañana" } })
    fireEvent.change(screen.getByLabelText("repetir"), { target: { value: "pan caliente cada mañana" } })
    for (const text of [/12 caracteres o más/, /Una frase/, /Las dos coinciden/]) {
      expect(rule(text)).toHaveTextContent("cumplido")
    }
    expect(screen.getByText(/muy buena\. Cumple 3 de 3/)).toBeInTheDocument()
  })
})
