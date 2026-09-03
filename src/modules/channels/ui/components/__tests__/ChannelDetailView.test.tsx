import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import type { ChannelDTO } from "@/modules/channels/domain/channel"

const replace = jest.fn()
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn(), replace }) }))
jest.mock("@/modules/channels/infrastructure/hooks/use-channels-realtime", () => ({
  useChannelsRealtime: () => ({ connected: true }),
}))

const store = {
  channels: [] as ChannelDTO[],
  removeChannel: jest.fn(),
  upsertChannel: jest.fn(),
}
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector(store),
}))

const getChannelById = jest.fn()
const disconnectChannel = jest.fn()
const deleteChannel = jest.fn()
jest.mock("@/modules/channels/infrastructure/services/channels-service.adapter", () => ({
  getChannelById: (id: string) => getChannelById(id),
  disconnectChannel: (id: string) => disconnectChannel(id),
  deleteChannel: (id: string) => deleteChannel(id),
}))

/** El modal se captura: el test ejecuta la acción de confirmar a mano. */
type ModalAction = { label: string; onClick?: () => Promise<void> | void }
let lastModal: { title: string; description: string; actions: ModalAction[] } | null = null
const showAlert = jest.fn()
const closeModal = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({
    showAlert,
    closeModal,
    showModal: (config: { title: string; description: string; actions: ModalAction[] }) => {
      lastModal = config
    },
  }),
}))

// Piezas con su propio spec o que hablan con Meta: se doblan por marcadores
jest.mock("@/modules/channels/ui/forms/ChannelForm", () => ({
  __esModule: true,
  default: ({ renderSubmit }: { renderSubmit?: (s: { formId: string; submitting: boolean }) => React.ReactNode }) => (
    <div>
      <form id="channel-detail-form" />
      {renderSubmit?.({ formId: "channel-detail-form", submitting: false })}
    </div>
  ),
}))
jest.mock("../ChannelHealthCard", () => ({ ChannelHealthCard: () => <p>salud</p> }))
jest.mock("../ReconnectChannelDialog", () => ({
  ReconnectChannelDialog: ({ open }: { open: boolean }) => (open ? <p>diálogo de reconexión</p> : null),
}))
jest.mock("../MetaPinDialog", () => ({
  MetaPinDialog: ({ open }: { open: boolean }) => (open ? <p>diálogo del PIN</p> : null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ChannelDetailView } = require("../ChannelDetailView") as typeof import("../ChannelDetailView")

function channel(overrides: Partial<ChannelDTO> = {}): ChannelDTO {
  return {
    id: "ch-1",
    name: "Ventas",
    kind: "whatsapp_cloud",
    provider_account_id: "111",
    status: "connected",
    display_phone_number: "+57 300 000 0000",
    verified_name: "Axi",
    waba_id: "555",
    default_ai_agent_id: null,
    credentials_configured: true,
    token_last4: "9876",
    quality_rating: null,
    messaging_limit: null,
    last_health_check_at: null,
    token_expires_at: null,
    credentials_revoked: false,
    disconnected_at: null,
    business_id: null,
    connection_method: "embedded_signup",
    onboarding: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    ...overrides,
  } as ChannelDTO
}

async function renderDetail(current: ChannelDTO) {
  getChannelById.mockResolvedValue(current)
  render(<ChannelDetailView channelId={current.id} />)
  await screen.findByRole("heading", { level: 1, name: current.name })
}

describe("ChannelDetailView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastModal = null
    store.channels = []
  })

  it("un canal conectado ofrece Renovar, Desconectar y Eliminar; no Reconectar ni PIN", async () => {
    await renderDetail(channel())

    expect(screen.getByRole("button", { name: /renovar conexión/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^desconectar$/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /eliminar canal/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^reconectar$/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /confirmar pin/i })).toBeNull()
  })

  it("con el número sin PIN, «Confirmar PIN» es la acción principal y abre su diálogo", async () => {
    await renderDetail(channel({ onboarding: { status: "awaiting_registration" } } as Partial<ChannelDTO>))

    fireEvent.click(screen.getByRole("button", { name: /confirmar pin/i }))
    expect(screen.getByText(/diálogo del pin/i)).toBeInTheDocument()
  })

  it("desconectado: ofrece Reconectar y no Renovar (era la misma acción con dos botones)", async () => {
    await renderDetail(channel({ status: "disconnected", disconnected_at: "2026-08-03T10:00:00.000Z" }))

    expect(screen.getByRole("button", { name: /^reconectar$/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /renovar conexión/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /^desconectar$/i })).toBeNull()
    expect(screen.getByText(/lo desconectaste el 3 de agosto/i)).toBeInTheDocument()
  })

  it("desconectar: el badge cambia en cuanto el POST vuelve, sin esperar al WS", async () => {
    const current = channel()
    await renderDetail(current)
    disconnectChannel.mockResolvedValueOnce({ ...current, status: "disconnected" })

    fireEvent.click(screen.getByRole("button", { name: /^desconectar$/i }))
    expect(lastModal?.description).toMatch(/conservas el historial/i)
    await act(async () => {
      await lastModal?.actions.find((action) => action.label === "Desconectar")?.onClick?.()
    })

    await waitFor(() => expect(screen.getByText("Desconectado")).toBeInTheDocument())
    // Al store también: la cabecera pinta `live ?? fetched` y `live` gana
    expect(store.upsertChannel).toHaveBeenCalledWith(expect.objectContaining({ status: "disconnected" }))
    expect(closeModal).toHaveBeenCalled()
  })

  it("eliminar: confirma con el texto ÚNICO del dominio, borra una sola vez y vuelve al listado", async () => {
    const current = channel()
    await renderDetail(current)
    let release: () => void = () => undefined
    deleteChannel.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))

    fireEvent.click(screen.getByRole("button", { name: /eliminar canal/i }))
    expect(lastModal?.title).toBe("Eliminar canal")
    expect(lastModal?.description).toMatch(/“Ventas”/)
    const confirm = lastModal?.actions.find((action) => action.label === "Eliminar")
    // Doble clic en «Eliminar» mientras el primero está en vuelo
    await act(async () => {
      const first = confirm?.onClick?.()
      const second = confirm?.onClick?.()
      release()
      await Promise.all([first, second])
    })

    expect(deleteChannel).toHaveBeenCalledTimes(1)
    expect(store.removeChannel).toHaveBeenCalledWith("ch-1")
    expect(replace).toHaveBeenCalledWith("/settings/channels")
  })

  it("el botón de guardar envía el formulario del detalle por su id, sin getElementById", async () => {
    await renderDetail(channel())
    const save = screen.getByRole("button", { name: /guardar cambios/i })
    expect(save).toHaveAttribute("type", "submit")
    expect(save).toHaveAttribute("form", "channel-detail-form")
  })
})
