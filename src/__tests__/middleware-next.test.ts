/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { middleware } from "../middleware"

describe("middleware: el ?next= del login va saneado (QA H3-1)", () => {
  it("una ruta privada vuelve tal cual, con su query", () => {
    const res = middleware(new NextRequest("https://app.axi-connect.co/crm/pipeline?deal=1"))
    const location = new URL(res.headers.get("location")!)
    expect(location.pathname).toBe("/auth/login")
    expect(location.searchParams.get("next")).toBe("/crm/pipeline?deal=1")
  })

  it.each(["https://app.axi-connect.co//evil.com/x", "https://app.axi-connect.co/\\evil.com"])(
    "un pathname de red (%s) nunca viaja como next hostil",
    (url) => {
      const location = middleware(new NextRequest(url)).headers.get("location")
      // O no redirige (es público), o el next es interno.
      if (location) expect(new URL(location).searchParams.get("next")).not.toMatch(/^\/\/|^\/\\|^[a-z]+:/i)
    },
  )
})
