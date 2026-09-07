import { act, fireEvent, render, screen } from "@testing-library/react"

import AgentsInterceptCreate from "../(.)create/page"

/**
 * Incidente 2026-09-07 en `/admin/agents`: pulsar «Guardar» con el formulario
 * inválido cerraba el diálogo y hacía `router.back()`; con el formulario válido
 * el cierre automático y el `onSuccess` hacían DOS `router.back()` y el usuario
 * aterrizaba en la bandeja. Este test fija el contrato de la ruta interceptada:
 * el diálogo solo se cierra cuando el formulario termina bien, y una sola vez.
 */
const back = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: () => ({ back, push: jest.fn(), replace: jest.fn() }),
}))

const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}))

const fetchAgents = jest.fn().mockResolvedValue(undefined)
jest.mock("@/modules/agents/infrastructure/stores/agent.context", () => ({
  useAgent: () => ({ fetchAgents }),
}))

// El formulario real trae catálogos, voces y plantillas; aquí solo importa su
// contrato con el host: `id="agent-form"` y `onSuccess` cuando el envío termina bien.
let formValid = false
jest.mock("@/modules/agents/ui/forms/AgentForm", () => ({
  AgentForm: ({ host }: { host: { onSuccess: () => void } }) => (
    <form
      id="agent-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (formValid) host.onSuccess()
      }}
    >
      <input aria-label="Nombre" />
    </form>
  ),
}))

describe("/admin/agents/@form/(.)create", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    formValid = false
  })

  it("«Guardar» con el formulario inválido deja el diálogo abierto y no navega", () => {
    render(<AgentsInterceptCreate />)

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }))

    expect(back).not.toHaveBeenCalled()
    expect(screen.getByRole("heading", { name: "Crear agente" })).toBeInTheDocument()
  })

  it("«Guardar» con el formulario válido vuelve atrás UNA sola vez", async () => {
    formValid = true
    render(<AgentsInterceptCreate />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Guardar" }))
    })

    expect(fetchAgents).toHaveBeenCalledTimes(1)
    expect(back).toHaveBeenCalledTimes(1)
  })

  it("«Cancelar» cierra y vuelve atrás una vez", () => {
    render(<AgentsInterceptCreate />)

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(back).toHaveBeenCalledTimes(1)
  })
})
