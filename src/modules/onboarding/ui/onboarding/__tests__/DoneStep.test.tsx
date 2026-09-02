import { render, screen, waitFor } from "@testing-library/react"

import { DoneStep } from "../steps/DoneStep"
import { emptyProgress } from "@/modules/onboarding/domain/onboarding-progress"
import type { EntitlementsDTO } from "@/modules/onboarding/domain/entitlements"

const getMyEntitlements = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getMyEntitlements: (...args: unknown[]) => getMyEntitlements(...args),
}))

const progress = {
  ...emptyProgress("c1", "2026-09-01T10:00:00Z"),
  niche_code: "restaurants",
  steps: {
    niche: { status: "done" as const, completed_at: "x" },
    business_hours: { status: "done" as const, completed_at: "x" },
    catalog: { status: "skipped" as const, completed_at: null },
    agents: { status: "done" as const, completed_at: "x" },
    whatsapp: { status: "done" as const, completed_at: "x" },
  },
}

const entitlements: EntitlementsDTO = {
  offer_kind: "package",
  plans: [{ id: "p", code: "sbs", public_slug: "sbs", kind: "package", name: "Small Business Suite" }],
  capabilities: ["core", "sales"],
  pending_offer: null,
  trial: { active: true, ends_at: "2026-09-08T10:00:00Z" },
  included: [
    { metric: "ai_tokens_output", period: "billing_cycle", quantity_raw: 112500, quantity_display: "75", unit_label: "conversaciones con IA" },
    { metric: "tts_characters", period: "billing_cycle", quantity_raw: 15000, quantity_display: "15.000", unit_label: "caracteres de voz", approx_display: "50 notas de voz" },
  ],
}

describe("DoneStep", () => {
  beforeEach(() => jest.resetAllMocks())

  it("resume lo configurado y pinta lo que incluye la prueba en unidades comerciales", async () => {
    getMyEntitlements.mockResolvedValueOnce(entitlements)
    render(<DoneStep progress={progress} companyName="La Parrilla" saving={false} error={null} onFinish={jest.fn()} />)

    expect(screen.getByRole("heading", { name: /la parrilla está lista/i })).toBeInTheDocument()
    expect(screen.getByText("Restaurantes y comida")).toBeInTheDocument()
    expect(screen.getAllByText("Para después")).toHaveLength(1)

    const block = await screen.findByRole("region", { name: /qué incluye tu prueba/i })
    expect(block).toHaveTextContent(/tu prueba de 7 días incluye/i)
    expect(block).toHaveTextContent("75")
    expect(block).toHaveTextContent(/≈ 50 notas de voz/)
    expect(block).toHaveTextContent(/vence el 8 de septiembre/i)
    expect(block).toHaveTextContent(/al continuar con small business suite/i)
  })

  it("si los entitlements no cargan, el cierre sigue sin ese bloque", async () => {
    getMyEntitlements.mockRejectedValueOnce(new Error("boom"))
    render(<DoneStep progress={progress} companyName={null} saving={false} error={null} onFinish={jest.fn()} />)

    await waitFor(() => expect(getMyEntitlements).toHaveBeenCalled())
    expect(screen.queryByRole("region", { name: /qué incluye tu prueba/i })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /ir a mi panel/i })).toBeEnabled()
  })
})
