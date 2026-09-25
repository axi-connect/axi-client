import {
  defaultSupportSessionValues,
  supportSessionSchema,
  toIssueSupportSessionDTO,
} from "../support-session-form.config"

const valid = {
  ...defaultSupportSessionValues,
  reason: "El agente no cotiza los combos desde ayer",
  password: "frase de plataforma",
}

describe("«Entrar como soporte»: validación local", () => {
  it("60 min por defecto y el DTO del servidor, sin ticket si va vacío", () => {
    expect(defaultSupportSessionValues.minutes).toBe("60")
    expect(toIssueSupportSessionDTO(valid)).toEqual({
      reason: "El agente no cotiza los combos desde ayer",
      minutes: 60,
      password: "frase de plataforma",
    })
    expect(toIssueSupportSessionDTO({ ...valid, ticket_ref: " SUP-12 " }).ticket_ref).toBe("SUP-12")
  })

  it("el motivo pide al menos 20 caracteres", () => {
    expect(supportSessionSchema.safeParse({ ...valid, reason: "reviso algo" }).success).toBe(false)
  })

  it.each([["14"], ["61"], ["30.5"], ["abc"]])("la duración %s está fuera de 15 a 60", (minutes) => {
    expect(supportSessionSchema.safeParse({ ...valid, minutes }).success).toBe(false)
  })

  it("15 y 60 son válidos; la contraseña es obligatoria", () => {
    expect(supportSessionSchema.safeParse({ ...valid, minutes: "15" }).success).toBe(true)
    expect(supportSessionSchema.safeParse({ ...valid, password: "" }).success).toBe(false)
  })
})
