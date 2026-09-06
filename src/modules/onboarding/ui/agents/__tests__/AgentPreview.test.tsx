import { render, screen } from "@testing-library/react"

import { AgentPreview } from "../AgentPreview"
import { previewConversation } from "../agent-preview-copy"

describe("AgentPreview", () => {
  it("presenta al agente con su nombre, su empresa y su personalidad, y pregunta por el producto del nicho", () => {
    render(<AgentPreview name="Joao" tone="cercano" characterName="Axel" companyName="La Parrilla" nicheCode="restaurants" />)
    const phone = screen.getByTestId("agent-preview")
    expect(phone).toHaveTextContent("Joao")
    expect(phone).toHaveTextContent("Personalidad: Axel")
    expect(phone).toHaveTextContent(/Soy Joao, de La Parrilla/)
    expect(phone).toHaveTextContent(/hamburguesa doble/i)
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
  })

  it("no repite la empresa si el nombre ya la lleva, y sin nombre habla «tu agente»", () => {
    const { rerender } = render(<AgentPreview name="Vendedor de La Parrilla" tone="cercano" characterName={null} companyName="La Parrilla" nicheCode={null} />)
    expect(screen.getByTestId("agent-preview")).toHaveTextContent(/Soy Vendedor de La Parrilla\./)
    rerender(<AgentPreview name="   " tone="cercano" characterName={null} companyName={null} nicheCode={null} />)
    expect(screen.getByTestId("agent-preview")).toHaveTextContent(/Soy Tu agente\./)
  })

  it("cada tono produce un saludo distinto", () => {
    const greeting = (tone: "cercano" | "formal" | "directo") => previewConversation({ name: "Joao", tone, companyName: null, nicheCode: "restaurants" })[0].text
    expect(greeting("cercano")).toMatch(/¡Hola! Soy Joao/)
    expect(greeting("formal")).toMatch(/Le atiende Joao/)
    expect(greeting("directo")).toMatch(/Dime qué necesitas/)
    expect(new Set([greeting("cercano"), greeting("formal"), greeting("directo")]).size).toBe(3)
  })
})
