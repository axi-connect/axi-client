import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { AgentTemplatesStep } from "../steps/AgentTemplatesStep"
import type { AgentTemplateDTO } from "@/modules/onboarding/domain/agent-templates"

const listAgentTemplates = jest.fn()
const createAgentFromTemplate = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/agent-templates-service.adapter", () => ({
  listAgentTemplates: (...args: unknown[]) => listAgentTemplates(...args),
  createAgentFromTemplate: (...args: unknown[]) => createAgentFromTemplate(...args),
}))

jest.mock("@/modules/agents/public", () => ({
  clearTenantAgentsCache: jest.fn(),
  listCharacters: () =>
    Promise.resolve({ data: [{ id: "char-sys", name: "Asesor profesional", style: { tone: "profesional" }, voice: null, resources: null, is_system: true }] }),
  characterStyle: (character: { style: Record<string, unknown> | null }) => character.style ?? {},
  characterHasVoice: () => false,
}))

const sales: AgentTemplateDTO = {
  code: "restaurants_ventas",
  niche_code: "restaurants",
  name: "Vendedor de menú",
  role: "ventas",
  description: "Presenta la carta, arma el pedido y lo pasa a cocina.",
  default_skills: ["Catálogo", "Pedidos"],
  intention_codes: [{ code: "sales_inquiry" }],
  recommended_character_id: "char-sys",
  recommended_voice_id: null,
  placeholders: ["company.name"],
  recommended: true,
}
const bookings: AgentTemplateDTO = { ...sales, code: "restaurants_reservas", name: "Reservas y eventos", role: "reservas", recommended: false }

const props = () => ({
  nicheCode: "restaurants",
  companyName: "La Parrilla",
  saving: false,
  onBack: jest.fn(),
  onSkip: jest.fn(),
  onDone: jest.fn(),
})

describe("AgentTemplatesStep", () => {
  beforeEach(() => jest.resetAllMocks())

  it("carga las plantillas del nicho y preselecciona la recomendada", async () => {
    listAgentTemplates.mockResolvedValueOnce([bookings, sales])
    render(<AgentTemplatesStep {...props()} />)

    expect(await screen.findByRole("radio", { name: /vendedor de menú/i })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: /reservas y eventos/i })).toHaveAttribute("aria-checked", "false")
    expect(listAgentTemplates).toHaveBeenCalledWith("restaurants")
  })

  it("«tal cual» crea el agente sin pasar por la personalización y habilita Continuar con su id", async () => {
    listAgentTemplates.mockResolvedValueOnce([sales, bookings])
    createAgentFromTemplate.mockResolvedValueOnce({ id: "a1", name: "Vendedor de La Parrilla" })
    const p = props()
    render(<AgentTemplatesStep {...p} />)

    // Los botones están deshabilitados hasta que llegan las plantillas.
    await screen.findByRole("radio", { name: /vendedor de menú/i })
    fireEvent.click(screen.getByRole("button", { name: /crear el recomendado tal cual/i }))

    await waitFor(() =>
      expect(createAgentFromTemplate).toHaveBeenCalledWith({
        template_code: "restaurants_ventas",
        overrides: { name: "Vendedor de La Parrilla" },
        status: "active",
      }),
    )
    expect(await screen.findByRole("heading", { name: /tu agente está listo/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }))
    expect(p.onDone).toHaveBeenCalledWith({ agent_ids: ["a1"] })
  })

  it("personalizar abre el formulario en pantalla con el teléfono en vivo, respeta el borrador y manda solo los cambios", async () => {
    listAgentTemplates.mockResolvedValueOnce([sales])
    createAgentFromTemplate.mockResolvedValueOnce({ id: "a2", name: "Joao" })
    render(<AgentTemplatesStep {...props()} />)

    await screen.findByRole("radio", { name: /vendedor de menú/i })
    // El teléfono ya habla como el recomendado, con el nombre de la empresa.
    expect(screen.getByTestId("agent-preview")).toHaveTextContent(/Vendedor de La Parrilla/)
    fireEvent.click(screen.getByRole("button", { name: /^personalizar$/i }))
    expect(await screen.findByRole("heading", { name: /dale su voz a vendedor de la parrilla/i })).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/nombre del agente/i), { target: { value: "Joao" } })
    fireEvent.click(screen.getByRole("radio", { name: /formal/i }))
    fireEvent.change(screen.getByLabelText(/datos clave/i), { target: { value: "Domicilios en Laureles." } })
    // El teléfono cambia en vivo: nombre nuevo, tono formal y la personalidad recomendada.
    const phone = screen.getByTestId("agent-preview")
    expect(phone).toHaveTextContent(/Le atiende Joao, de La Parrilla/)
    expect(phone).toHaveTextContent(/Personalidad: Asesor profesional/)

    fireEvent.click(screen.getByRole("button", { name: /crear agente/i }))

    await waitFor(() =>
      expect(createAgentFromTemplate).toHaveBeenCalledWith({
        template_code: "restaurants_ventas",
        overrides: { name: "Joao", tone: "formal", extra_instructions: "Domicilios en Laureles." },
        status: "active",
      }),
    )
    expect(await screen.findByRole("heading", { name: /tu agente está listo/i })).toBeInTheDocument()
    expect(screen.getByRole("list", { name: /agentes creados/i })).toHaveTextContent(/Joao/)
  })

  it("si las plantillas no cargan ofrece reintentar y seguir sin agente", async () => {
    listAgentTemplates.mockRejectedValueOnce(new Error("Sin conexión con el servidor"))
    const p = props()
    render(<AgentTemplatesStep {...p} />)

    // `errorMessage` conserva el mensaje de un Error plano; el fallback es para respuestas sin texto.
    expect(await screen.findByRole("alert")).toHaveTextContent(/sin conexión/i)
    listAgentTemplates.mockResolvedValueOnce([sales])
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(await screen.findByRole("radio", { name: /vendedor de menú/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /configurar después/i }))
    expect(p.onSkip).toHaveBeenCalled()
  })
})
