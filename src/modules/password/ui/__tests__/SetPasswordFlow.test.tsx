import { fireEvent, render, screen } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"
import { SetPasswordFlow } from "../SetPasswordFlow"
import {
  inspectPasswordToken,
  setPasswordWithToken,
} from "../../infrastructure/services/password-service.adapter"

jest.mock("../../infrastructure/services/password-service.adapter", () => ({
  inspectPasswordToken: jest.fn(),
  setPasswordWithToken: jest.fn(),
}))
const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))

const inspect = inspectPasswordToken as jest.MockedFunction<typeof inspectPasswordToken>
const setPassword = setPasswordWithToken as jest.MockedFunction<typeof setPasswordWithToken>
const TOKEN = "Zk3n0p-Qa_9sT2uV8wXyZ0123"

function tokenGone(reason?: string) {
  return new HttpError({
    status: 410,
    code: "auth/password_token_invalid",
    message: "gone",
    problem: {
      type: "about:blank",
      title: "Gone",
      status: 410,
      code: "auth/password_token_invalid",
      ...(reason ? { details: { reason } } : {}),
    },
  })
}

describe("SetPasswordFlow", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    window.history.replaceState(null, "", `/auth/crear-contrasena#token=${TOKEN}`)
  })

  it("con el enlace vivo pide la contraseña, la guarda y confirma", async () => {
    inspect.mockResolvedValue({ purpose: "invite", email_masked: "an***@laespiga.co", expires_at: "2026-10-01T20:40:00Z" })
    setPassword.mockResolvedValue(undefined)
    render(<SetPasswordFlow purpose="invite" />)

    expect(await screen.findByRole("heading", { name: "Crea tu contraseña" })).toBeInTheDocument()
    expect(inspect).toHaveBeenCalledWith(TOKEN)
    expect(window.location.hash).toBe("")
    expect(screen.getByText(/vence el/)).toHaveTextContent("jue 1 oct · 3:40 p. m.")

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "una frase larga" } })
    fireEvent.change(screen.getByLabelText("Repítela"), { target: { value: "una frase larga" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar y entrar a mi panel" }))

    expect(await screen.findByRole("heading", { name: "Listo, tu contraseña quedó creada" })).toBeInTheDocument()
    expect(setPassword).toHaveBeenCalledWith(TOKEN, "una frase larga")
    expect(screen.getByRole("link", { name: "Entrar a mi panel" })).toHaveAttribute("href", "/auth/login")
  })

  it("rechaza una contraseña de menos de 12 caracteres sin llamar al servidor", async () => {
    inspect.mockResolvedValue({ purpose: "invite", email_masked: "a***@x.co", expires_at: "2026-10-01T20:40:00Z" })
    render(<SetPasswordFlow purpose="invite" />)
    const field = await screen.findByLabelText("Contraseña nueva")
    fireEvent.change(field, { target: { value: "corta" } })
    fireEvent.blur(field)
    expect(await screen.findByText("Mínimo 12 caracteres")).toBeInTheDocument()
    expect(setPassword).not.toHaveBeenCalled()
  })

  it("un enlace vencido ofrece pedir uno nuevo", async () => {
    inspect.mockRejectedValue(tokenGone())
    render(<SetPasswordFlow purpose="invite" />)
    expect(await screen.findByRole("heading", { name: "Este enlace ya venció" })).toBeInTheDocument()
    expect(screen.getByText(/dura 72 horas/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir un enlace nuevo" })).toHaveAttribute("href", "/auth/olvide-contrasena")
  })

  it("un enlace ya usado manda a iniciar sesión", async () => {
    inspect.mockRejectedValue(tokenGone("consumed"))
    render(<SetPasswordFlow purpose="invite" />)
    expect(await screen.findByRole("heading", { name: "Este enlace ya se usó" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toHaveAttribute("href", "/auth/login")
  })

  it("sin token en la URL no llama al servidor", async () => {
    window.history.replaceState(null, "", "/auth/restablecer")
    render(<SetPasswordFlow purpose="reset" />)
    expect(await screen.findByRole("heading", { name: "Este enlace ya venció" })).toBeInTheDocument()
    expect(screen.getByText(/dura 1 hora/)).toBeInTheDocument()
    expect(inspect).not.toHaveBeenCalled()
  })
})
