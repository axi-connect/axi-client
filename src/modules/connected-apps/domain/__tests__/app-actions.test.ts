import type { AssistantActionView } from "@/shared/components/features/assistant"
import {
  appOrigin,
  mergeAppAction,
  NOT_AVAILABLE,
  phaseFromDecision,
  visibleAppActions,
  type AppActionDTO,
} from "../app-actions"

const DTO: AppActionDTO = {
  id: "a1",
  assistant: "mcp",
  door: "mcp",
  origin_label: "Claude",
  thread_id: null,
  tool: "producto_guardar",
  risk: "external",
  status: "pending",
  preview: { summary: "Enviar campaña", lines: null, effects: ["Llega a 1.240 clientes"] },
  outcome_text: null,
  expires_at: "2099-01-01T00:00:00.000Z",
  decided_at: null,
  created_at: "2026-11-18T15:00:00.000Z",
}

describe("acciones de apps conectadas: dominio", () => {
  it("el DTO se vuelve la vista de la tarjeta, con su origen", () => {
    expect(mergeAppAction(undefined, DTO)).toMatchObject({
      id: "a1",
      risk: "external",
      summary: "Enviar campaña",
      effects: ["Llega a 1.240 clientes"],
      phase: "pending",
      origin: "Claude",
      busy: null,
    })
    expect(appOrigin(null)).toBe("una app conectada")
  })

  it("una decisión en vuelo y el «sin permiso» local sobreviven a una relectura", () => {
    const busy = { ...mergeAppAction(undefined, DTO), busy: "confirm" as const }
    expect(mergeAppAction(busy, DTO).busy).toBe("confirm")
    const forbidden = { ...mergeAppAction(undefined, DTO), phase: "forbidden" as const, text: "No" }
    expect(mergeAppAction(forbidden, DTO).phase).toBe("forbidden")
  })

  it("desenlaces de la decisión", () => {
    expect(phaseFromDecision({ action_id: "a1", outcome: "executed", text: "Hecho" })).toEqual({ phase: "executed", text: "Hecho" })
    expect(phaseFromDecision({ action_id: "a1", outcome: "rejected", text: null })).toEqual({ phase: "rejected", text: null })
    expect(phaseFromDecision({ action_id: "a1", outcome: "not_found", text: null })).toEqual({ phase: "expired", text: NOT_AVAILABLE })
    expect(phaseFromDecision({ action_id: "a1", outcome: "forbidden", text: null }).phase).toBe("forbidden")
  })

  it("se ven las pendientes y las decididas en esta visita; el historial viejo no", () => {
    const view = (id: string, phase: AssistantActionView["phase"]) => ({ ...mergeAppAction(undefined, { ...DTO, id }), phase })
    const actions = [view("p", "pending"), view("old", "executed"), view("now", "rejected")]
    expect(visibleAppActions(actions, new Set(["now"])).map((action) => action.id)).toEqual(["p", "now"])
  })
})
