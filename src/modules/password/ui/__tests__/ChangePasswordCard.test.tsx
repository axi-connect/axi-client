import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { HttpError } from "@/core/api/problem"
import { ChangePasswordCard } from "../ChangePasswordCard"
import { changePassword } from "../../infrastructure/services/password-service.adapter"

jest.mock("../../infrastructure/services/password-service.adapter", () => ({ changePassword: jest.fn() }))
const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))

const change = changePassword as jest.MockedFunction<typeof changePassword>

function fill() {
  fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "vieja frase larga" } })
  fireEvent.change(screen.getByLabelText("Contraseña nueva"), { target: { value: "una frase larga" } })
  fireEvent.change(screen.getByLabelText("Repítela"), { target: { value: "una frase larga" } })
  fireEvent.click(screen.getByRole("button", { name: "Guardar contraseña nueva" }))
}

describe("ChangePasswordCard", () => {
  beforeEach(() => jest.resetAllMocks())

  it("ante el throttle (429) avisa que espere", async () => {
    change.mockRejectedValue(
      new HttpError({ status: 429, code: "auth/too_many_attempts", message: "x", retryAfterSeconds: 60 }),
    )
    render(<ChangePasswordCard />)
    fill()
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith({
        tone: "warning",
        title: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
      }),
    )
  })

  it("una contraseña actual equivocada se marca en su campo", async () => {
    change.mockRejectedValue(new HttpError({ status: 422, code: "auth/current_password_invalid", message: "x" }))
    render(<ChangePasswordCard />)
    fill()
    expect(await screen.findByText("La contraseña actual no coincide")).toBeInTheDocument()
    expect(showAlert).not.toHaveBeenCalled()
  })
})
