import { fireEvent, render, screen } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"
import { SetPasswordFlow } from "../SetPasswordFlow"
import {
  enterLogin,
  enterPanel,
  inspectPasswordToken,
  setPasswordWithToken,
} from "../../infrastructure/services/password-service.adapter"

jest.mock("../../infrastructure/services/password-service.adapter", () => ({
  inspectPasswordToken: jest.fn(),
  setPasswordWithToken: jest.fn(),
  enterPanel: jest.fn(),
  enterLogin: jest.fn(),
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
    inspect.mockResolvedValue({
      purpose: "invite",
      email_masked: "an***@laespiga.co",
      expires_at: "2026-10-01T20:40:00Z",
      business_name: "Panadería La Espiga",
    })
    setPassword.mockResolvedValue({ session: false })
    render(<SetPasswordFlow purpose="invite" />)

    expect(await screen.findByRole("heading", { name: "Crea tu contraseña" })).toBeInTheDocument()
    expect(inspect).toHaveBeenCalledWith(TOKEN)
    expect(window.location.hash).toBe("")
    expect(screen.getByText(/vence el/)).toHaveTextContent("Este enlace sirve una vez y vence el jue 1 oct · 3:40 p. m.")
    expect(screen.getByText(/vence el/).textContent).not.toMatch(/\.\.$/)
    expect(screen.getByText("Es la llave de tu panel de Panadería La Espiga. Solo tú la vas a conocer.")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "una frase larga" } })
    fireEvent.change(screen.getByLabelText("Repítela"), { target: { value: "una frase larga" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar y entrar a mi panel" }))

    // 204 del servidor (sin sesión): al login con «Tu contraseña quedó creada».
    await screen.findByText("Un momento…")
    expect(setPassword).toHaveBeenCalledWith(TOKEN, "una frase larga")
    expect(enterLogin).toHaveBeenCalledWith("creada")
    expect(enterPanel).not.toHaveBeenCalled()
  })

  it("con la sesión que devuelve el servidor entra directo al panel, sin pasar por el login (QA-6)", async () => {
    inspect.mockResolvedValue({ purpose: "invite", email_masked: "a***@x.co", expires_at: "2026-10-01T20:40:00Z", business_name: "X" })
    setPassword.mockResolvedValue({ session: true })
    render(<SetPasswordFlow purpose="invite" />)
    fireEvent.change(await screen.findByLabelText("Contraseña nueva"), { target: { value: "una frase larga" } })
    fireEvent.change(screen.getByLabelText("Repítela"), { target: { value: "una frase larga" } })
    fireEvent.click(screen.getByRole("button", { name: "Guardar y entrar a mi panel" }))

    await screen.findByText("Un momento…")
    expect(enterPanel).toHaveBeenCalledTimes(1)
    expect(enterLogin).not.toHaveBeenCalled()
  })

  it("rechaza una contraseña de menos de 12 caracteres sin llamar al servidor", async () => {
    inspect.mockResolvedValue({ purpose: "invite", email_masked: "a***@x.co", expires_at: "2026-10-01T20:40:00Z", business_name: "X" })
    render(<SetPasswordFlow purpose="invite" />)
    const field = await screen.findByLabelText("Contraseña nueva")
    fireEvent.change(field, { target: { value: "corta" } })
    fireEvent.blur(field)
    expect(await screen.findByText("Mínimo 12 caracteres")).toBeInTheDocument()
    expect(setPassword).not.toHaveBeenCalled()
  })

  it("un enlace reemplazado por un reenvío lo dice, y no «venció» (QA H2-6)", async () => {
    inspect.mockRejectedValue(tokenGone("revoked"))
    render(<SetPasswordFlow purpose="invite" />)
    expect(await screen.findByRole("heading", { name: "Este enlace se reemplazó" })).toBeInTheDocument()
    expect(screen.getByText("Este enlace se reemplazó por uno más nuevo. Revisa tu correo más reciente.")).toBeInTheDocument()
    expect(screen.queryByText(/venció/)).not.toBeInTheDocument()
  })

  it.each(["expired", undefined])("un enlace vencido (%s) ofrece pedir uno nuevo", async (reason) => {
    inspect.mockRejectedValue(tokenGone(reason))
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
