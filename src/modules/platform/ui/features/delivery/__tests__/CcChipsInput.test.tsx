import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { CcChipsInput } from "../CcChipsInput"

function Harness({ onValue }: { onValue: (value: string[]) => void }) {
  const [value, setValue] = useState<string[]>([])
  return (
    <CcChipsInput
      id="cc"
      value={value}
      ownerEmail="hola@laespiga.co"
      onChange={(next) => {
        setValue(next)
        onValue(next)
      }}
    />
  )
}

describe("CcChipsInput (QA H2-3)", () => {
  it("lo escrito sin Enter se vuelve chip al salir del campo, y lo dice", () => {
    const onValue = jest.fn()
    render(<Harness onValue={onValue} />)
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "camila@axi-connect.co" } })
    fireEvent.blur(input)
    expect(onValue).toHaveBeenLastCalledWith(["camila@axi-connect.co"])
    expect(screen.getByRole("status")).toHaveTextContent("Se agregó camila@axi-connect.co a la copia")
  })

  it("un texto que no es correo no se agrega y avisa", () => {
    const onValue = jest.fn()
    render(<Harness onValue={onValue} />)
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "camila@axi" } })
    fireEvent.blur(input)
    expect(screen.getByRole("alert")).toHaveTextContent("no parece un correo")
    expect(onValue).not.toHaveBeenLastCalledWith(expect.arrayContaining(["camila@axi"]))
  })
})
