import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { OnboardingView } from "../OnboardingView"
import { emptyProgress, type OnboardingProgressDTO } from "@/modules/onboarding/domain/onboarding-progress"
import { resetOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store"

const replace = jest.fn()
const router = { replace, push: jest.fn() }
let search = new URLSearchParams("")
jest.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => search,
}))

const getOnboardingProgress = jest.fn()
const updateOnboardingProgress = jest.fn()
const completeOnboarding = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getOnboardingProgress: (...args: unknown[]) => getOnboardingProgress(...args),
  updateOnboardingProgress: (...args: unknown[]) => updateOnboardingProgress(...args),
  completeOnboarding: (...args: unknown[]) => completeOnboarding(...args),
}))

jest.mock("@/modules/companies/public", () => ({
  loadMyCompanyOnce: () => Promise.resolve({ name: "La Parrilla de Joao", timezone: "America/Bogota", schedules: [] }),
  invalidateMyCompanyCache: jest.fn(),
  SchedulesEditor: ({ onSaved }: { onSaved?: () => void }) => (
    <button type="button" onClick={onSaved}>
      Guardar horario
    </button>
  ),
}))

jest.mock("@/shared/auth/auth.hooks", () => ({
  useSession: () => ({ status: "authenticated", user: { email: "joao@laparrilla.co" }, isAuthenticated: true }),
}))

jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert: jest.fn() }),
}))

const NOW = "2026-09-01T10:00:00Z"
const fresh = (): OnboardingProgressDTO => emptyProgress("c1", NOW)
const withNiche = (): OnboardingProgressDTO => ({
  ...fresh(),
  niche_code: "restaurants",
  steps: { niche: { status: "done", completed_at: NOW } },
})

describe("OnboardingView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetOnboardingStore()
    search = new URLSearchParams("")
  })

  it("un onboarding ya completado manda al panel", async () => {
    getOnboardingProgress.mockResolvedValueOnce({ ...fresh(), completed_at: NOW })
    render(<OnboardingView />)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"))
  })

  it("arranca en Negocio, guarda el nicho y sigue a Horarios", async () => {
    getOnboardingProgress.mockResolvedValueOnce(fresh())
    updateOnboardingProgress.mockResolvedValueOnce(withNiche())
    render(<OnboardingView />)

    const restaurants = await screen.findByRole("radio", { name: /restaurantes y comida/i })
    const next = screen.getByRole("button", { name: /continuar/i })
    expect(next).toBeDisabled()

    fireEvent.click(restaurants)
    fireEvent.click(screen.getByRole("button", { name: /continuar/i }))

    await waitFor(() => expect(updateOnboardingProgress).toHaveBeenCalledTimes(1))
    expect(updateOnboardingProgress.mock.calls[0][0]).toEqual({
      niche_code: "restaurants",
      current_step: "business_hours",
      steps: { niche: { status: "done", data: { niche_code: "restaurants" } } },
    })
    expect(await screen.findByRole("heading", { name: /tu horario de atención/i })).toBeInTheDocument()
  })

  it("con ?step= inalcanzable cae al primer paso abierto", async () => {
    search = new URLSearchParams("step=agents")
    getOnboardingProgress.mockResolvedValueOnce(withNiche())
    render(<OnboardingView />)
    expect(await screen.findByRole("heading", { name: /tu horario de atención/i })).toBeInTheDocument()
  })

  it("mantener el horario lo marca omitido y avanza al catálogo", async () => {
    getOnboardingProgress.mockResolvedValueOnce(withNiche())
    updateOnboardingProgress.mockResolvedValueOnce({
      ...withNiche(),
      steps: { niche: { status: "done", completed_at: NOW }, business_hours: { status: "skipped", completed_at: null } },
    })
    render(<OnboardingView />)

    fireEvent.click(await screen.findByRole("button", { name: /mantener este horario/i }))

    await waitFor(() => expect(updateOnboardingProgress).toHaveBeenCalledWith({ steps: { business_hours: { status: "skipped" } } }))
    expect(await screen.findByRole("heading", { name: /carga tu catálogo/i })).toBeInTheDocument()
  })

  it("con todo cerrado muestra el resumen y cierra el onboarding", async () => {
    const closed: OnboardingProgressDTO = {
      ...withNiche(),
      steps: {
        niche: { status: "done", completed_at: NOW },
        business_hours: { status: "done", completed_at: NOW },
        catalog: { status: "skipped", completed_at: null },
        agents: { status: "skipped", completed_at: null },
        whatsapp: { status: "skipped", completed_at: null },
      },
    }
    getOnboardingProgress.mockResolvedValueOnce(closed)
    completeOnboarding.mockResolvedValueOnce({ ...closed, completed_at: NOW })
    render(<OnboardingView />)

    expect(await screen.findByRole("heading", { name: /la parrilla de joao está lista/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /ir a mi panel/i }))

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"))
  })

  it("si el progreso no carga ofrece reintentar sin bloquear la salida al panel", async () => {
    getOnboardingProgress.mockRejectedValueOnce(new Error("boom"))
    render(<OnboardingView />)

    expect(await screen.findByRole("heading", { name: /no pudimos cargar tu progreso/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /ir al panel/i })).toHaveAttribute("href", "/dashboard")
    getOnboardingProgress.mockResolvedValueOnce(fresh())
    fireEvent.click(screen.getByRole("button", { name: /reintentar/i }))
    expect(await screen.findByRole("radiogroup", { name: /tipo de negocio/i })).toBeInTheDocument()
  })
})
