jest.mock("@/shared/auth/auth.hooks", () => ({ useSession: () => ({ status: "unauthenticated" }) }))
jest.mock("@/modules/companies/infrastructure/services/company-cache", () => ({ loadMyCompanyOnce: jest.fn() }))

import { trialStatusFrom } from "../use-trial-status"

const trial = { status: "trial" as const, trial_ends_at: "2026-10-02T04:59:59Z", timezone: "America/Bogota" }

describe("trialStatusFrom (QA-8): días de calendario en la zona del tenant", () => {
  it("el día 0 de una prueba de 7 muestra 7, no 8", () => {
    expect(trialStatusFrom(trial, new Date("2026-09-24T13:00:00Z")).daysLeft).toBe(7)
  })

  it("el día 7 da 0 («termina hoy») y avisa que termina", () => {
    const status = trialStatusFrom(trial, new Date("2026-10-01T22:00:00Z"))
    expect(status).toMatchObject({ active: true, daysLeft: 0, ending: true })
  })

  it("sin zona usa la de Bogotá; fuera de prueba no hay aviso", () => {
    expect(trialStatusFrom({ ...trial, timezone: "" }, new Date("2026-09-24T13:00:00Z")).daysLeft).toBe(7)
    expect(trialStatusFrom({ ...trial, status: "active" }).active).toBe(false)
  })
})
