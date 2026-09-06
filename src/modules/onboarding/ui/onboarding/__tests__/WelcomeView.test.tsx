import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useImperativeHandle, type Ref } from "react"

import { WelcomeView } from "../WelcomeView"
import type { EntitlementsDTO } from "@/modules/onboarding/domain/entitlements"

let phase: "idle" | "covering" | "leaving" = "idle"
jest.mock("@/core/providers/splash-provider", () => ({
  useSplashOptional: () => ({ start: jest.fn(), markReady: jest.fn(), phase }),
}))

const fire = jest.fn()
jest.mock("@/shared/components/ui/confetti", () => ({
  Confetti: ({ ref }: { ref?: Ref<{ fire: typeof fire }> }) => {
    useImperativeHandle(ref, () => ({ fire }))
    return null
  },
  brandCelebration: (colors: string[]) => [{ colors }],
}))

const getMyEntitlements = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getMyEntitlements: (...args: unknown[]) => getMyEntitlements(...args),
}))

const entitlements: EntitlementsDTO = {
  offer_kind: "package",
  plans: [{ id: "p", code: "sbs", public_slug: "sbs", kind: "package", name: "Small Business Suite" }],
  capabilities: ["core"],
  pending_offer: null,
  quote: null,
  trial: { active: true, ends_at: "2026-09-09T10:00:00Z" },
  included: [],
}

describe("WelcomeView", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    phase = "idle"
  })

  it("saluda por el nombre, cita la empresa, la oferta y la fecha de fin de la prueba", async () => {
    getMyEntitlements.mockResolvedValueOnce(entitlements)
    render(<WelcomeView firstName="Joao" companyName="La Parrilla de Joao" onStart={jest.fn()} />)

    const heading = screen.getByRole("heading", { level: 1, name: "Bienvenido a Axi Connect, Joao" })
    expect(heading).toHaveFocus()
    expect(screen.getByText("La Parrilla de Joao")).toBeInTheDocument()
    expect(await screen.findByText("Small Business Suite")).toBeInTheDocument()
    expect(screen.getByText("9 de septiembre")).toBeInTheDocument()
    expect(screen.getByRole("list")).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(5)
    expect(screen.getByRole("link", { name: /ve directo a tu panel/i })).toHaveAttribute("href", "/dashboard")
    expect(screen.getByRole("link", { name: "axi connect" })).toHaveAttribute("href", "/")
  })

  it("sin nombre ni entitlements sigue siendo una bienvenida completa", async () => {
    getMyEntitlements.mockRejectedValueOnce(new Error("boom"))
    render(<WelcomeView firstName={null} companyName={null} onStart={jest.fn()} />)

    expect(screen.getByRole("heading", { level: 1, name: "Bienvenido a Axi Connect" })).toBeInTheDocument()
    await waitFor(() => expect(getMyEntitlements).toHaveBeenCalled())
    expect(screen.getByText("Tu empresa")).toBeInTheDocument()
    expect(screen.getByText(/hasta que termine no te pedimos tarjeta/i)).toBeInTheDocument()
  })

  it("el confeti se dispara una sola vez, y solo cuando el splash ya se fue", () => {
    getMyEntitlements.mockResolvedValue(entitlements)
    phase = "covering"
    const { rerender } = render(<WelcomeView firstName="Joao" companyName="La Parrilla" onStart={jest.fn()} />)
    expect(fire).not.toHaveBeenCalled()

    phase = "idle"
    rerender(<WelcomeView firstName="Joao" companyName="La Parrilla" onStart={jest.fn()} />)
    expect(fire).toHaveBeenCalledTimes(1)
    expect(fire.mock.calls[0][0][0].colors).toHaveLength(3)

    rerender(<WelcomeView firstName="Joao" companyName="La Parrilla" onStart={jest.fn()} />)
    expect(fire).toHaveBeenCalledTimes(1)
  })

  it("«Configurar mi empresa» avisa a quien la monta", () => {
    getMyEntitlements.mockResolvedValue(entitlements)
    const onStart = jest.fn()
    render(<WelcomeView firstName="Joao" companyName="La Parrilla" onStart={onStart} />)
    fireEvent.click(screen.getByRole("button", { name: /configurar mi empresa/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})
