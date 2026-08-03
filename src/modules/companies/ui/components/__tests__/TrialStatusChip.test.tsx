import { render, screen } from "@testing-library/react"
import { TrialStatusChip } from "../TrialStatusChip"
import type { CompanyDTO } from "@/modules/companies/domain/company"

const DAY_MS = 24 * 60 * 60 * 1000

jest.mock("@/shared/auth/auth.hooks", () => ({
  useSession: () => ({ status: "authenticated", user: null }),
}))

const loadMyCompanyOnce = jest.fn<Promise<CompanyDTO>, []>()
jest.mock("@/modules/companies/infrastructure/services/company-cache", () => ({
  loadMyCompanyOnce: () => loadMyCompanyOnce(),
}))

function company(over: Partial<CompanyDTO>): CompanyDTO {
  return {
    id: "c-1",
    name: "Demo",
    nit: "900",
    isotype_url: null,
    address: null,
    city: null,
    country_code: "CO",
    currency: "COP",
    industry: null,
    activity_description: null,
    timezone: "America/Bogota",
    status: "trial",
    trial_ends_at: null,
    schedules: [],
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
    ...over,
  } as CompanyDTO
}

describe("TrialStatusChip", () => {
  it("muestra los días restantes de un trial vigente (tono neutro)", async () => {
    loadMyCompanyOnce.mockResolvedValue(
      company({ trial_ends_at: new Date(Date.now() + 5 * DAY_MS + 60_000).toISOString() }),
    )
    render(<TrialStatusChip />)

    const chip = await screen.findByTestId("trial-status-chip")
    expect(chip).toHaveTextContent("Prueba: 6 días")
    expect(chip.className).not.toContain("text-warning")
  })

  it("escala a tono warning en los últimos 2 días", async () => {
    loadMyCompanyOnce.mockResolvedValue(
      company({ trial_ends_at: new Date(Date.now() + 1 * DAY_MS + 60_000).toISOString() }),
    )
    render(<TrialStatusChip />)

    const chip = await screen.findByTestId("trial-status-chip")
    expect(chip).toHaveTextContent("Prueba: 2 días")
    expect(chip.className).toContain("text-warning")
  })

  it("no renderiza nada si la empresa está activa o el trial no tiene fecha", async () => {
    loadMyCompanyOnce.mockResolvedValue(company({ status: "active" }))
    const { container, rerender } = render(<TrialStatusChip />)
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()

    // Trial legacy sin fecha: tampoco hay chip (no hay nada que contar)
    loadMyCompanyOnce.mockResolvedValue(company({ status: "trial", trial_ends_at: null }))
    rerender(<TrialStatusChip />)
    await Promise.resolve()
    expect(container).toBeEmptyDOMElement()
  })
})
