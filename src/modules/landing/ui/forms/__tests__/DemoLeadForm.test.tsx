import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { DemoLeadForm } from "../DemoLeadForm"
import { createDemoLead } from "@/modules/landing/infrastructure/services/lead-service.adapter"

jest.mock("@/modules/landing/infrastructure/services/lead-service.adapter", () => ({
  createDemoLead: jest.fn().mockResolvedValue({ ok: true }),
}))
jest.mock("@/core/analytics/track", () => ({ track: jest.fn() }))

const createDemoLeadMock = createDemoLead as jest.MockedFunction<typeof createDemoLead>

/**
 * Lo que se protege aquí es lo que estuvo roto: el formulario recibía tráfico y
 * NO guardaba nada — su adaptador era un temporizador que descartaba el envío—,
 * así que todo el que no pulsara «enviar» dentro de WhatsApp se perdía entero.
 */
function fill(overrides: { consent?: boolean } = {}) {
  fireEvent.change(screen.getByPlaceholderText("¿Cómo te llamas?"), {
    target: { value: "Ana Ruiz" },
  })
  fireEvent.change(screen.getByPlaceholderText("¿Cómo se llama tu negocio?"), {
    target: { value: "Panadería Ana" },
  })
  fireEvent.change(screen.getByPlaceholderText("Tu WhatsApp"), {
    target: { value: "3001234567" },
  })
  if (overrides.consent !== false) {
    fireEvent.click(screen.getByRole("checkbox"))
  }
}

describe("DemoLeadForm", () => {
  const open = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    createDemoLeadMock.mockResolvedValue({ ok: true })
    window.open = open
  })

  it("persiste el lead ANTES de abrir WhatsApp", async () => {
    render(<DemoLeadForm />)
    fill()
    fireEvent.submit(screen.getByRole("button", { name: /agendar/i }))

    await waitFor(() => {
      expect(createDemoLeadMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Ana Ruiz", business_name: "Panadería Ana" }),
      )
    })
    await waitFor(() => {
      expect(open).toHaveBeenCalledWith(expect.stringContaining("wa.me"), "_blank", "noopener")
    })
  })

  it("sin la casilla de tratamiento de datos no envía nada", async () => {
    render(<DemoLeadForm />)
    fill({ consent: false })
    fireEvent.submit(screen.getByRole("button", { name: /agendar/i }))

    await waitFor(() => {
      expect(screen.getByText(/autorizaci[óo]n/i)).toBeInTheDocument()
    })
    expect(createDemoLeadMock).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it("si la persistencia falla, el visitante sigue llegando a WhatsApp", async () => {
    // Un lead que entra por chat vale más que un mensaje de error en pantalla.
    createDemoLeadMock.mockRejectedValueOnce(new Error("red caída"))
    render(<DemoLeadForm />)
    fill()
    fireEvent.submit(screen.getByRole("button", { name: /agendar/i }))

    await waitFor(() => {
      expect(open).toHaveBeenCalled()
    })
  })
})
