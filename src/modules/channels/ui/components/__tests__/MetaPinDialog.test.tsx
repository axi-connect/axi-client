import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import type { ChannelDTO } from "@/modules/channels/domain/channel"

const registerMetaPhoneNumber = jest.fn()
jest.mock("@/modules/channels/infrastructure/services/meta-signup.adapter", () => ({
  registerMetaPhoneNumber: (id: string, pin: string) => registerMetaPhoneNumber(id, pin),
}))
const upsertChannel = jest.fn()
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector({ upsertChannel }),
}))
const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}))
// El Modal real es Radix: aquí solo importa que pinte a sus hijos cuando está abierto
jest.mock("@/shared/components/ui/modal", () => ({
  Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { MetaPinDialog } = require("../MetaPinDialog") as typeof import("../MetaPinDialog")

const channel = {
  id: "ch-1",
  name: "Ventas",
  kind: "whatsapp_cloud",
  display_phone_number: "+57 300 000 0000",
  onboarding: { status: "awaiting_registration" },
} as unknown as ChannelDTO

function typePin(pin: string) {
  const inputs = screen.getAllByRole("textbox", { name: /Dígito \d de 6/ })
  pin.split("").forEach((digit, index) => fireEvent.change(inputs[index], { target: { value: digit } }))
}

/**
 * La entrada al PIN desde el detalle: antes no existía ninguna, y el aviso de
 * salud mandaba a «Renovar», que devolvía el mismo sub-estado.
 */
describe("MetaPinDialog", () => {
  beforeEach(() => jest.clearAllMocks())

  it("envía el PIN al endpoint de registro, actualiza el store y cierra", async () => {
    const updated = { ...channel, onboarding: { status: "completed" } }
    registerMetaPhoneNumber.mockResolvedValueOnce(updated)
    const onOpenChange = jest.fn()
    render(<MetaPinDialog channel={channel} open onOpenChange={onOpenChange} />)

    typePin("123456")
    fireEvent.click(screen.getByRole("button", { name: /confirmar y activar/i }))

    await waitFor(() => expect(registerMetaPhoneNumber).toHaveBeenCalledWith("ch-1", "123456"))
    // Al store: el detalle pinta desde ahí, y sin esto el aviso «falta el PIN»
    // seguiría visible sobre un canal ya registrado
    expect(upsertChannel).toHaveBeenCalledWith(updated)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }))
  })

  it("un PIN rechazado se explica en el propio formulario y no cierra", async () => {
    registerMetaPhoneNumber.mockRejectedValueOnce(new Error("PIN incorrecto"))
    const onOpenChange = jest.fn()
    render(<MetaPinDialog channel={channel} open onOpenChange={onOpenChange} />)

    typePin("000000")
    fireEvent.click(screen.getByRole("button", { name: /confirmar y activar/i }))

    expect(await screen.findByText(/no pudimos verificar el pin/i)).toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(upsertChannel).not.toHaveBeenCalled()
  })

  it("cerrado no pinta nada", () => {
    render(<MetaPinDialog channel={channel} open={false} onOpenChange={jest.fn()} />)
    expect(screen.queryByRole("button", { name: /confirmar y activar/i })).toBeNull()
  })
})
