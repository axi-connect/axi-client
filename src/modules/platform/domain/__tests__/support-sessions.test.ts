import {
  adminNamesFrom,
  auditActorLabel,
  formatSupportDuration,
  groupSupportActivity,
  isOpenSupportSession,
  supportTabUrl,
  type SupportSession,
} from "../support-sessions"

type Log = Parameters<typeof groupSupportActivity>[0][number]

let seq = 0
function log(over: Partial<Log>): Log {
  seq += 1
  return {
    id: `l-${seq}`,
    actor_type: "user",
    actor_user_id: "u-1",
    action: "products.updated",
    entity_type: "product",
    entity_id: "p-1",
    changes: null,
    occurred_at: `2026-09-25T10:${String(60 - seq).padStart(2, "0")}:00Z`,
    ...over,
  }
}

const read = (session: string, at: string) =>
  log({ actor_type: "platform_admin", actor_user_id: "adm-1", action: "support.read", entity_type: "support_session", entity_id: session, occurred_at: at })

describe("groupSupportActivity (O11)", () => {
  it("una fila por sesión de soporte con sus pantallas y cambios, en el lugar de su actividad más reciente", () => {
    const logs = [
      log({ id: "arriba", occurred_at: "2026-09-25T11:00:00Z" }),
      read("s-1", "2026-09-25T10:50:00Z"),
      log({ actor_type: "platform_admin", actor_user_id: "adm-1", action: "support.write", entity_type: "support_session", entity_id: "s-1", occurred_at: "2026-09-25T10:45:00Z" }),
      log({ id: "cambio-real", actor_type: "platform_admin", actor_user_id: "adm-1", action: "products.updated", changes: { support_session_id: "s-1" } }),
      read("s-1", "2026-09-25T10:40:00Z"),
      log({ actor_type: "platform_admin", action: "support.write_failed", entity_type: "support_session", entity_id: "s-1", occurred_at: "2026-09-25T10:30:00Z" }),
      read("s-2", "2026-09-24T09:00:00Z"),
    ]
    const items = groupSupportActivity(logs)
    expect(items.map((item) => (item.kind === "log" ? item.log.id : item.sessionId))).toEqual([
      "arriba",
      "s-1",
      "cambio-real",
      "s-2",
    ])
    const s1 = items[1]
    expect(s1).toMatchObject({ kind: "support", screens: 2, changes: 1, failed: 1, occurredAt: "2026-09-25T10:50:00Z" })
    expect(s1.kind === "support" && s1.logs).toHaveLength(4)
  })

  it("sin actividad de soporte deja la lista igual", () => {
    const logs = [log({}), log({})]
    expect(groupSupportActivity(logs).every((item) => item.kind === "log")).toBe(true)
  })
})

describe("auditActorLabel (D2)", () => {
  const names = new Map([["adm-1", "Camila Restrepo"]])
  it("platform_admin se lee «Soporte Axi · nombre», y sin nombre «Soporte Axi»", () => {
    expect(auditActorLabel({ actor_type: "platform_admin", actor_user_id: "adm-1" }, names)).toBe("Soporte Axi · Camila Restrepo")
    expect(auditActorLabel({ actor_type: "platform_admin", actor_user_id: "otro" }, names)).toBe("Soporte Axi")
    expect(auditActorLabel({ actor_type: "platform_admin", actor_user_id: null }, names)).toBe("Soporte Axi")
  })
  it("los demás actores no cambian", () => {
    expect(auditActorLabel({ actor_type: "user", actor_user_id: "adm-1" }, names)).toBe("user")
  })
})

describe("registro de sesiones", () => {
  const session = (over: Partial<SupportSession>): SupportSession => ({
    id: "s-1",
    platform_user: { id: "adm-1", name: "Camila Restrepo", email: "camila@axi-connect.co" },
    reason: "El agente no cotiza los combos desde ayer",
    ticket_ref: null,
    status: "ended",
    created_at: "2026-09-25T10:00:00Z",
    redeemed_at: "2026-09-25T10:00:20Z",
    expires_at: "2026-09-25T11:00:00Z",
    ended_at: "2026-09-25T10:42:00Z",
    end_reason: "ended",
    duration_s: 2520,
    request_count: 37,
    changes_count: 2,
    ...over,
  })

  it("nombres por id, duración y cuáles se pueden cerrar", () => {
    expect(adminNamesFrom([session({}), session({ platform_user: null })]).get("adm-1")).toBe("Camila Restrepo")
    expect(formatSupportDuration(2520)).toBe("42 min")
    expect(formatSupportDuration(20)).toBe("1 min")
    expect(formatSupportDuration(null)).toBe("—")
    expect(isOpenSupportSession(session({ status: "active" }))).toBe(true)
    expect(isOpenSupportSession(session({ status: "pending" }))).toBe(true)
    expect(isOpenSupportSession(session({ status: "revoked" }))).toBe(false)
  })

  it("el código va en el # de la pestaña, nunca en la query", () => {
    expect(supportTabUrl("abc_-123")).toBe("/auth/soporte#code=abc_-123")
  })
})
