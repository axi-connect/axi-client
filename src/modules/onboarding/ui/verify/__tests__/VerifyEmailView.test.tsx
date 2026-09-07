import { StrictMode } from "react"
import { act, render, screen, waitFor } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"

import { VerifyEmailView } from "../VerifyEmailView"

let token: string | null = "tok-1234567890"
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => (key === "token" ? token : null) }),
}))

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "suspended"
let status: AuthStatus = "authenticated"
const refresh = jest.fn()
jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ status, refresh }),
}))

const verifyEmail = jest.fn()
jest.mock("@/modules/onboarding/infrastructure/services/onboarding-service.adapter", () => ({
  verifyEmail: (...args: unknown[]) => verifyEmail(...args),
}))

function pendingVerification() {
  let resolve!: (value: { verified: true }) => void
  verifyEmail.mockReturnValue(
    new Promise<{ verified: true }>((res) => {
      resolve = res
    }),
  )
  return () => act(async () => resolve({ verified: true }))
}

describe("VerifyEmailView", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    token = "tok-1234567890"
    status = "authenticated"
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
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("incidente 2026-09-07: la sesión hidrata mientras la petición está en vuelo y el resultado se honra igual", async () => {
    status = "loading"
    const resolve = pendingVerification()
    const { rerender } = render(<VerifyEmailView />)
    expect(screen.getByRole("heading", { name: "Confirmando tu correo…" })).toBeInTheDocument()

    // `AuthProvider.hydrate()` termina antes que el API: cambia `status` y re-renderiza.
    status = "authenticated"
    rerender(<VerifyEmailView />)
    await resolve()

    expect(screen.getByRole("heading", { name: "Correo confirmado" })).toBeInTheDocument()
    expect(verifyEmail).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it("en StrictMode (doble montaje de efectos) llama una sola vez y llega a confirmado", async () => {
    verifyEmail.mockResolvedValue({ verified: true })
    render(
      <StrictMode>
        <VerifyEmailView />
      </StrictMode>,
    )

    expect(await screen.findByRole("heading", { name: "Correo confirmado" })).toBeInTheDocument()
    expect(verifyEmail).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it("si el API responde antes de que hidrate la sesión, refresca cuando la sesión llega", async () => {
    status = "loading"
    verifyEmail.mockResolvedValue({ verified: true })
    const { rerender } = render(<VerifyEmailView />)

    expect(await screen.findByRole("heading", { name: "Correo confirmado" })).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
    // Mientras hidrata, el CTA ya apunta al onboarding (el guard manda al login si hace falta).
    expect(screen.getByRole("link", { name: "Continuar con la configuración" })).toHaveAttribute("href", "/onboarding")

    status = "authenticated"
    rerender(<VerifyEmailView />)
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it("sin sesión, el CTA lleva al login con next=/onboarding y no refresca", async () => {
    status = "unauthenticated"
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
    expect(refresh).not.toHaveBeenCalled()
  })

  it("otro error → mensaje del backend como alerta", async () => {
    verifyEmail.mockRejectedValue(new HttpError({ status: 500, code: "internal/unexpected", message: "boom" }))
    render(<VerifyEmailView />)

    expect(await screen.findByRole("alert")).toHaveTextContent(/\S/)
  })

  it("sin token no llama al backend", () => {
    token = null
    render(<VerifyEmailView />)

    expect(screen.getByRole("heading", { name: "El enlace está incompleto" })).toBeInTheDocument()
    expect(verifyEmail).not.toHaveBeenCalled()
  })
})
