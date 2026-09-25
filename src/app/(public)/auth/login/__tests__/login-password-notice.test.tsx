import { render, screen } from "@testing-library/react"

let params = new URLSearchParams()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => params,
}))
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ login: jest.fn() }) }))
jest.mock("@/core/providers/splash-provider", () => ({ useSplashOptional: () => null }))

import LoginForm from "../form"

describe("login: el aviso de la contraseña recién creada (QA-6)", () => {
  it("?contrasena=creada dice «Tu contraseña quedó creada. Inicia sesión.»", () => {
    params = new URLSearchParams("contrasena=creada")
    render(<LoginForm />)
    expect(screen.getByRole("status")).toHaveTextContent("Tu contraseña quedó creada. Inicia sesión.")
  })

  it("sin el parámetro no hay aviso", () => {
    params = new URLSearchParams()
    render(<LoginForm />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
