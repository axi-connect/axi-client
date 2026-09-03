import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { OnboardingResumeBanner } from "../OnboardingResumeBanner"
import { emptyProgress } from "@/modules/onboarding/domain/onboarding-progress"
import { resetOnboardingStore } from "@/modules/onboarding/infrastructure/stores/onboarding.store"

const getOnboardingProgress = jest.fn()
const updateOnboardingProgress = jest.fn()
const dismissOnboardingBanner = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  getOnboardingProgress: (...args: unknown[]) => getOnboardingProgress(...args),
  updateOnboardingProgress: (...args: unknown[]) => updateOnboardingProgress(...args),
  dismissOnboardingBanner: (...args: unknown[]) => dismissOnboardingBanner(...args),
  completeOnboarding: jest.fn(),
  getMyEntitlements: () => Promise.reject(new Error("sin entitlements en este test")),
  resendVerificationEmail: jest.fn(),
}))

const NOW = "2026-09-01T10:00:00Z"

describe("OnboardingResumeBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    resetOnboardingStore()
  })

  it("cuenta los pasos pendientes y enlaza al primero abierto", async () => {
    getOnboardingProgress.mockResolvedValueOnce({
      ...emptyProgress("c1", NOW),
      steps: { niche: { status: "done", completed_at: NOW }, business_hours: { status: "done", completed_at: NOW } },
    })
    render(<OnboardingResumeBanner />)

    expect(await screen.findByRole("heading", { name: /te faltan 3 pasos/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /continuar/i })).toHaveAttribute("href", "/onboarding?step=catalog")
  })

  it("no aparece si el onboarding terminó o el usuario lo ocultó", async () => {
    getOnboardingProgress.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), completed_at: NOW })
    const { container, unmount } = render(<OnboardingResumeBanner />)
    await waitFor(() => expect(getOnboardingProgress).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
    unmount()

    resetOnboardingStore()
    getOnboardingProgress.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), banner_dismissed_at: NOW })
    const second = render(<OnboardingResumeBanner />)
    await waitFor(() => expect(getOnboardingProgress).toHaveBeenCalledTimes(2))
    expect(second.container).toBeEmptyDOMElement()
  })

  it("no pinta nada si el progreso no carga: el error no es del dashboard", async () => {
    getOnboardingProgress.mockRejectedValueOnce(new Error("boom"))
    const { container } = render(<OnboardingResumeBanner />)
    await waitFor(() => expect(getOnboardingProgress).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it("ocultar lo quita al instante y lo persiste en el servidor", async () => {
    getOnboardingProgress.mockResolvedValueOnce(emptyProgress("c1", NOW))
    dismissOnboardingBanner.mockResolvedValueOnce({ ...emptyProgress("c1", NOW), banner_dismissed_at: NOW })
    render(<OnboardingResumeBanner />)

    fireEvent.click(await screen.findByRole("button", { name: /ocultar/i }))

    await waitFor(() => expect(screen.queryByRole("heading", { name: /te faltan/i })).not.toBeInTheDocument())
    // Endpoint propio con `companies:read`, no el PUT de edición.
    expect(dismissOnboardingBanner).toHaveBeenCalledTimes(1)
    expect(updateOnboardingProgress).not.toHaveBeenCalled()
  })
})
