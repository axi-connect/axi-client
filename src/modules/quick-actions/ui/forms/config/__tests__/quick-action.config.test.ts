import {
  defaultQuickActionFormValues,
  quickActionFormSchema,
  toCreateQuickActionDTO,
  type QuickActionFormValues,
} from "../quick-action.config"
import type { QuickActionInteractive } from "@/modules/quick-actions/domain/quick-action"

function values(overrides: Partial<QuickActionFormValues> = {}): QuickActionFormValues {
  return {
    ...defaultQuickActionFormValues,
    name: "Menú de bienvenida",
    description: "Ofrece las opciones principales al saludar",
    type: "interactive",
    ...overrides,
  }
}

const VALID: QuickActionInteractive = {
  kind: "options",
  body: "¿En qué te ayudo?",
  options: [
    { title: "Ver catálogo", action: "reply" },
    { title: "Hablar con un asesor", action: "human_handoff" },
  ],
}

describe("acción rápida interactiva — validación del formulario", () => {
  it("acepta una configuración completa", () => {
    expect(quickActionFormSchema.safeParse(values({ interactive: VALID }).valueOf()).success).toBe(
      true,
    )
  })

  it.each([
    ["sin configurar", null],
    ["sin mensaje", { ...VALID, body: "  " }],
    ["con una sola opción", { ...VALID, options: [{ title: "Sí", action: "reply" as const }] }],
    [
      "con un título vacío",
      { ...VALID, options: [{ title: "Sí", action: "reply" as const }, { title: " " }] },
    ],
    [
      "con títulos repetidos",
      { ...VALID, options: [{ title: "Sí" }, { title: "sí" }] },
    ],
  ])("rechaza una configuración %s", (_label, interactive) => {
    const parsed = quickActionFormSchema.safeParse(
      values({ interactive: interactive as QuickActionInteractive | null }),
    )
    expect(parsed.success).toBe(false)
  })

  it("rechaza un CTA con enlace que no es una URL", () => {
    const parsed = quickActionFormSchema.safeParse(
      values({
        interactive: { kind: "cta_url", body: "Mira", label: "Abrir", url: "tienda.example.com" },
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it("el DTO NO lleva ids: los deriva el backend del título", () => {
    const dto = toCreateQuickActionDTO(values({ interactive: VALID }))
    expect(dto.type).toBe("interactive")
    expect(JSON.stringify(dto.interactive)).not.toContain('"id"')
    expect(dto.interactive).toEqual(VALID)
  })

  it("cambiar de tipo no arrastra la config interactiva al DTO", () => {
    const dto = toCreateQuickActionDTO(
      values({ type: "canned_response", body: "Hola", interactive: VALID }),
    )
    expect(dto.interactive).toBeUndefined()
  })
})
