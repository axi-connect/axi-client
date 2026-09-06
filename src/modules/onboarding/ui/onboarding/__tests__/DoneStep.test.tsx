import { act, render, screen, waitFor } from "@testing-library/react"
import { useImperativeHandle, type Ref } from "react"

import { DoneStep } from "../steps/DoneStep"
import { emptyProgress } from "@/modules/onboarding/domain/onboarding-progress"
import type { EntitlementsDTO } from "@/modules/onboarding/domain/entitlements"

const getMyEntitlements = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getMyEntitlements: (...args: unknown[]) => getMyEntitlements(...args),
}))

let phase: "idle" | "covering" | "leaving" = "idle"
jest.mock("@/core/providers/splash-provider", () => ({
  useSplashOptional: () => ({ start: jest.fn(), markReady: jest.fn(), phase }),
}))

// El canvas de confeti no existe en jsdom: se dobla para contar los disparos.
const fire = jest.fn()
jest.mock("@/shared/components/ui/confetti", () => ({
  Confetti: ({ ref }: { ref?: Ref<{ fire: typeof fire }> }) => {
    useImperativeHandle(ref, () => ({ fire }))
    return null
  },
  brandCelebrationShort: (colors: string[]) => [{ colors, short: true }],
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
    {
      metric: "ai_tokens_output",
      period: "billing_cycle",
      quantity_raw: 112500,
      quantity_display: "75",
      unit_label: "conversaciones con IA",
      approx_display: null,
      used_raw: null,
      used_display: null,
    },
    {
      metric: "tts_characters",
      period: "billing_cycle",
      quantity_raw: 15000,
      quantity_display: "15.000",
      unit_label: "caracteres de voz",
      approx_display: "50 notas de voz",
      used_raw: null,
      used_display: null,
    },
  ],
}

describe("DoneStep", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    jest.useRealTimers()
    phase = "idle"
  })

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

  it("celebra una sola vez, después de que la ruta encienda sus paradas y solo con el splash en reposo", () => {
    jest.useFakeTimers()
    getMyEntitlements.mockRejectedValue(new Error("sin entitlements"))
    phase = "covering"
    const { rerender } = render(<DoneStep progress={progress} companyName="La Parrilla" saving={false} error={null} onFinish={jest.fn()} />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(fire).not.toHaveBeenCalled()

    phase = "idle"
    rerender(<DoneStep progress={progress} companyName="La Parrilla" saving={false} error={null} onFinish={jest.fn()} />)
    // Cuatro paradas hechas + «Listo» a 140 ms cada una, más el respiro: aún no.
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(fire).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(fire).toHaveBeenCalledTimes(1)
    expect(fire.mock.calls[0][0][0].short).toBe(true)

    rerender(<DoneStep progress={progress} companyName="La Parrilla" saving={false} error={null} onFinish={jest.fn()} />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    expect(fire).toHaveBeenCalledTimes(1)
  })
})
