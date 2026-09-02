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

// El DetailSheet real usa portal + framer-motion: en test se dobla por un panel plano.
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({ open, title, children, renderFooter }: { open: boolean; title?: React.ReactNode; children?: React.ReactNode; renderFooter?: () => React.ReactNode }) =>
    open ? (
      <div role="dialog" aria-label={typeof title === "string" ? title : "sheet"}>
        {children}
        {renderFooter?.()}
      </div>
    ) : null,
  DetailSheetFooter: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
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

  it("«tal cual» crea el agente sin abrir el sheet y habilita Continuar con su id", async () => {
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
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(await screen.findByRole("heading", { name: /tu agente está listo/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /^continuar/i }))
    expect(p.onDone).toHaveBeenCalledWith({ agent_ids: ["a1"] })
  })

  it("personalizar abre el sheet, respeta el borrador y manda solo los cambios", async () => {
    listAgentTemplates.mockResolvedValueOnce([sales])
    createAgentFromTemplate.mockResolvedValueOnce({ id: "a2", name: "Joao" })
    render(<AgentTemplatesStep {...props()} />)

    await screen.findByRole("radio", { name: /vendedor de menú/i })
    fireEvent.click(screen.getByRole("button", { name: /personalizar y crear/i }))
    const dialog = await screen.findByRole("dialog")
    expect(dialog).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/nombre del agente/i), { target: { value: "Joao" } })
    fireEvent.click(screen.getByRole("radio", { name: /formal/i }))
    fireEvent.change(screen.getByLabelText(/datos clave/i), { target: { value: "Domicilios en Laureles." } })
    fireEvent.click(screen.getByRole("button", { name: /crear agente/i }))

    await waitFor(() =>
      expect(createAgentFromTemplate).toHaveBeenCalledWith({
        template_code: "restaurants_ventas",
        overrides: { name: "Joao", tone: "formal", extra_instructions: "Domicilios en Laureles." },
        status: "active",
      }),
    )
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
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
