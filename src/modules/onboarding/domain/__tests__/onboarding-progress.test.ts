import {
  canJumpTo,
  emptyProgress,
  firstOpenStep,
  pendingCount,
  progressPercent,
  resolveEntryStep,
  shouldShowResumeBanner,
  type OnboardingProgressDTO,
  isFreshProgress,
  ONBOARDING_WELCOME_PATH,
} from "../onboarding-progress"
import { NICHES, nicheByCode } from "../niches"

const base = emptyProgress("c1", "2026-09-01T10:00:00Z")
const withSteps = (steps: OnboardingProgressDTO["steps"]): OnboardingProgressDTO => ({ ...base, steps })

describe("máquina de pasos del onboarding", () => {
  it("abre el primer paso sin cerrar; omitido también cierra", () => {
    expect(firstOpenStep(base)).toBe("niche")
    expect(
      firstOpenStep(
        withSteps({
          niche: { status: "done", completed_at: "x" },
          business_hours: { status: "skipped", completed_at: null },
        }),
      ),
    ).toBe("catalog")
  })

  it("todo cerrado → no queda paso abierto", () => {
    const done = withSteps({
      niche: { status: "done", completed_at: "x" },
      business_hours: { status: "done", completed_at: "x" },
      catalog: { status: "skipped", completed_at: null },
      agents: { status: "done", completed_at: "x" },
      whatsapp: { status: "skipped", completed_at: null },
    })
    expect(firstOpenStep(done)).toBeNull()
    expect(pendingCount(done)).toBe(0)
    expect(progressPercent(done)).toBe(100)
  })

  it("permite volver a un paso cerrado y entrar al primero abierto, nunca saltar por encima", () => {
    const progress = withSteps({ niche: { status: "done", completed_at: "x" } })
    expect(canJumpTo("niche", progress)).toBe(true)
    expect(canJumpTo("business_hours", progress)).toBe(true)
    expect(canJumpTo("agents", progress)).toBe(false)
  })

  it("resuelve el paso de entrada desde la URL si es alcanzable", () => {
    const progress = withSteps({ niche: { status: "done", completed_at: "x" } })
    expect(resolveEntryStep(progress, "niche")).toBe("niche")
    expect(resolveEntryStep(progress, "agents")).toBe("business_hours")
    expect(resolveEntryStep(progress, "inventado")).toBe("business_hours")
    expect(resolveEntryStep(progress, null)).toBe("business_hours")
  })

  it("cuenta el progreso por pasos cerrados", () => {
    expect(progressPercent(base)).toBe(0)
    expect(progressPercent(withSteps({ niche: { status: "done", completed_at: "x" } }))).toBe(20)
    expect(pendingCount(withSteps({ niche: { status: "done", completed_at: "x" } }))).toBe(4)
  })

  it("el banner del dashboard sale solo con pendientes y sin ocultar", () => {
    expect(shouldShowResumeBanner(base)).toBe(true)
    expect(shouldShowResumeBanner({ ...base, banner_dismissed_at: "x" })).toBe(false)
    expect(shouldShowResumeBanner({ ...base, completed_at: "x" })).toBe(false)
  })
})

describe("nichos", () => {
  it("tiene los ocho nichos del plan más «Otro», con códigos únicos", () => {
    expect(NICHES).toHaveLength(9)
    expect(new Set(NICHES.map((niche) => niche.code)).size).toBe(9)
    expect(nicheByCode("restaurants")?.name).toBe("Restaurantes y comida")
    expect(nicheByCode("inventado")).toBeNull()
    expect(nicheByCode(null)).toBeNull()
  })
})

describe("isFreshProgress", () => {
  it("solo es fresco sin nicho, sin pasos cerrados y sin completar", () => {
    const fresh = emptyProgress("c1", "2026-09-01T10:00:00Z")
    expect(isFreshProgress(fresh)).toBe(true)
    expect(isFreshProgress({ ...fresh, niche_code: "restaurants" })).toBe(false)
    expect(isFreshProgress({ ...fresh, steps: { business_hours: { status: "skipped", completed_at: null } } })).toBe(false)
    expect(isFreshProgress({ ...fresh, completed_at: "2026-09-01T11:00:00Z" })).toBe(false)
  })

  it("la ruta de bienvenida lleva el query que la vista honra", () => {
    expect(ONBOARDING_WELCOME_PATH).toBe("/onboarding?welcome=1")
  })
})
