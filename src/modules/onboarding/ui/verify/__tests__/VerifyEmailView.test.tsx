import { render, screen, waitFor } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"

import { VerifyEmailView } from "../VerifyEmailView"

let token: string | null = "tok-1234567890"
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "token" ? token : null) }),
}))

let user: { email: string } | null = { email: "joao@laparrilla.co" }
const refresh = jest.fn()
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ user, refresh }),
}))

const verifyEmail = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  verifyEmail: (...args: unknown[]) => verifyEmail(...args),
}))

describe("VerifyEmailView", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    token = "tok-1234567890"
    user = { email: "joao@laparrilla.co" }
    refresh.mockResolvedValue(undefined)
  })

  it("verifica una sola vez, refresca la sesión y lleva a /onboarding", async () => {
    verifyEmail.mockResolvedValue({ verified: true })
    const { rerender } = render(<VerifyEmailView />)

    expect(await screen.findByRole("heading", { name: "Correo confirmado" })).toBeInTheDocument()
    expect(verifyEmail).toHaveBeenCalledWith("tok-1234567890")
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("link", { name: "Continuar con la configuración" })).toHaveAttribute("href", "/onboarding")

    rerender(<VerifyEmailView />)
    expect(verifyEmail).toHaveBeenCalledTimes(1)
  })

  it("sin sesión, el CTA lleva al login con next=/onboarding", async () => {
    user = null
    verifyEmail.mockResolvedValue({ verified: true })
    render(<VerifyEmailView />)

    expect(await screen.findByRole("heading", { name: "Correo confirmado" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toHaveAttribute("href", "/auth/login?next=/onboarding")
    expect(refresh).not.toHaveBeenCalled()
  })

  it("410 verification_expired → explica que el enlace venció y ofrece pedir otro", async () => {
    verifyEmail.mockRejectedValue(
      new HttpError({ status: 410, code: "onboarding/verification_expired", message: "expirado" }),
    )
    render(<VerifyEmailView />)

    expect(await screen.findByRole("heading", { name: "No pudimos confirmar tu correo" })).toBeInTheDocument()
    expect(screen.getByText(/venció o ya se usó/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Pedir un enlace nuevo/ })).toHaveAttribute("href", "/onboarding")
  })

  it("otro error → mensaje del backend como alerta", async () => {
    verifyEmail.mockRejectedValue(new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }))
    render(<VerifyEmailView />)

    expect(await screen.findByRole("alert")).toBeInTheDocument()
  })

  it("sin token no llama al backend", () => {
    token = null
    render(<VerifyEmailView />)

    expect(screen.getByRole("heading", { name: "El enlace está incompleto" })).toBeInTheDocument()
    expect(verifyEmail).not.toHaveBeenCalled()
  })
})
