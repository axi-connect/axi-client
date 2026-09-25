import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const replace = jest.fn()
let params = new URLSearchParams()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: jest.fn() }),
  useSearchParams: () => params,
}))
const login = jest.fn(async () => {})
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ login }) }))
jest.mock("@/core/providers/splash-provider", () => ({ useSplashOptional: () => ({ start: jest.fn() }) }))

import LoginForm, { loginNext } from "../form"

const HOSTILE = [
  "//evil.com",
  "https://evil.com",
  "/\\evil.com",
  "javascript:alert(1)",
  "/%2F%2Fevil.com",
  "http:/evil.com",
  "/\tevil.com",
  "\\\\evil.com",
  "data:text/html,<script>alert(1)</script>",
  "//evil.com/%2e%2e",
  "/\n/evil.com",
  " /dashboard",
  "evil.com",
  "/%09/evil.com",
  "/%0a/evil.com",
]

describe("login: el next tras entrar (QA H3-1)", () => {
  it.each(HOSTILE)("«%s» lleva al panel, nunca fuera ni a ejecutar código", (next) => {
    expect(loginNext(next)).toBe("/dashboard")
  })

  it("una ruta interna se respeta; /auth no (bucle)", () => {
    expect(loginNext("/crm/pipeline?x=1")).toBe("/crm/pipeline?x=1")
    expect(loginNext("/auth/login")).toBe("/dashboard")
    expect(loginNext(null)).toBe("/dashboard")
  })

  it("al entrar con next=javascript:alert(1), el router va a /dashboard", async () => {
    params = new URLSearchParams({ next: "javascript:alert(1)" })
    render(<LoginForm />)
    fireEvent.change(screen.getByPlaceholderText("tu@correo.com"), { target: { value: "a@b.co" } })
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "una-clave-cualquiera" } })
    fireEvent.submit(screen.getByPlaceholderText("tu@correo.com").closest("form")!)
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"))
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("javascript"))
  })
})
