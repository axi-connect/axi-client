import {
  defaultAgentName,
  draftBlocker,
  initialDraft,
  quickCreateDTO,
  recommendedTemplate,
  toCreateDTO,
  type AgentTemplateDTO,
} from "../agent-templates"

const sales: AgentTemplateDTO = {
  code: "restaurants_ventas",
  niche_code: "restaurants",
  name: "Vendedor de menú",
  role: "ventas",
  description: "Presenta la carta y arma el pedido.",
  default_skills: ["Catálogo", "Pedidos"],
  intention_codes: [{ code: "sales_inquiry", requirements: { require_catalog: true } }],
  recommended_character_id: "char-sys",
  recommended_voice_id: null,
  placeholders: ["company.name"],
  recommended: true,
}
const support: AgentTemplateDTO = { ...sales, code: "restaurants_soporte", name: "Atención y quejas", role: "soporte", recommended: false }

describe("plantillas de agente", () => {
  it("propone la recomendada y cae a la primera si ninguna lo es", () => {
    expect(recommendedTemplate([support, sales])?.code).toBe("restaurants_ventas")
    expect(recommendedTemplate([support])?.code).toBe("restaurants_soporte")
    expect(recommendedTemplate([])).toBeNull()
  })

  it("nombra al agente con el negocio, o con la plantilla si no lo conoce", () => {
    expect(defaultAgentName(sales, "La Parrilla")).toBe("Vendedor de La Parrilla")
    expect(defaultAgentName(support, "La Parrilla")).toBe("Atención de La Parrilla")
    expect(defaultAgentName(sales, null)).toBe("Vendedor de menú")
  })

  it("bloquea un borrador sin nombre o con datos clave demasiado largos", () => {
    const draft = initialDraft(sales, "La Parrilla")
    expect(draftBlocker(draft)).toBeNull()
    expect(draftBlocker({ ...draft, name: " " })).toMatch(/cómo se presentará/i)
    expect(draftBlocker({ ...draft, extra_instructions: "x".repeat(2001) })).toMatch(/2000/)
  })

  it("solo manda los cambios respecto a la plantilla, y siempre el nombre con la empresa", () => {
    const draft = { ...initialDraft(sales, "La Parrilla"), tone: "formal" as const, extra_instructions: " Domicilios en Laureles. " }
    expect(toCreateDTO(sales, draft, "La Parrilla")).toEqual({
      template_code: "restaurants_ventas",
      overrides: { name: "Vendedor de La Parrilla", tone: "formal", extra_instructions: "Domicilios en Laureles." },
      status: "active",
    })
    // Sin empresa y sin cambios: viaja la plantilla sola.
    expect(toCreateDTO(sales, initialDraft(sales, null), null)).toEqual({ template_code: "restaurants_ventas", status: "active" })
  })

  it("«tal cual» crea con el nombre del negocio y nada más", () => {
    expect(quickCreateDTO(sales, "La Parrilla")).toEqual({
      template_code: "restaurants_ventas",
      overrides: { name: "Vendedor de La Parrilla" },
      status: "active",
    })
  })
})
