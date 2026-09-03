import { act, fireEvent, render, screen } from "@testing-library/react"

import type { ChannelDTO } from "@/modules/channels/domain/channel"

const store = { channels: [] as ChannelDTO[], removeChannel: jest.fn() }
jest.mock("@/modules/channels/infrastructure/stores/channels.store", () => ({
  useChannelStore: (selector: (state: unknown) => unknown) => selector(store),
}))

const getChannelById = jest.fn()
const deleteChannel = jest.fn()
jest.mock("@/modules/channels/infrastructure/services/channels-service.adapter", () => ({
  getChannelById: (id: string) => getChannelById(id),
  deleteChannel: (id: string) => deleteChannel(id),
}))

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

// El DetailSheet real es un Sheet de Radix con su propio spec: aquí basta con que
// pida el detalle al abrirse y pinte a sus hijos
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    id,
    open,
    fetchDetail,
    children,
  }: {
    id?: string
    open: boolean
    fetchDetail: (id: string) => Promise<unknown>
    children: React.ReactNode
  }) => {
    if (open && id !== undefined) void fetchDetail(id)
    return open ? <div data-testid="sheet">{children}</div> : null
  },
}))
jest.mock("../ChannelHealthCard", () => ({ ChannelHealthCard: () => <p>salud</p> }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ChannelDetailSheet } = require("../ChannelDetailSheet") as typeof import("../ChannelDetailSheet")

const channel = { id: "ch-1", name: "Ventas", kind: "instagram_dm", status: "connected" } as unknown as ChannelDTO

describe("ChannelDetailSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastModal = null
    getChannelById.mockResolvedValue(channel)
  })

  it("se abre con el CustomEvent, borra UNA vez con el texto del dominio y se cierra", async () => {
    render(<ChannelDetailSheet />)
    act(() => {
      window.dispatchEvent(new CustomEvent("channels:detail:open", { detail: { id: "ch-1" } }))
    })
    await screen.findByRole("heading", { level: 1, name: "Ventas" })

    let release: () => void = () => undefined
    deleteChannel.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)))
    fireEvent.click(screen.getByRole("button", { name: /eliminar canal/i }))

    // El MISMO texto que la página de detalle: ya habían divergido
    expect(lastModal?.title).toBe("Eliminar canal")
    expect(lastModal?.description).toMatch(/las conversaciones quedan archivadas/i)
    const confirm = lastModal?.actions.find((action) => action.label === "Eliminar")
    await act(async () => {
      const first = confirm?.onClick?.()
      const second = confirm?.onClick?.()
      release()
      await Promise.all([first, second])
    })

    expect(deleteChannel).toHaveBeenCalledTimes(1)
    // Al store en optimista: no hace falta volver a pedir la lista
    expect(store.removeChannel).toHaveBeenCalledWith("ch-1")
    expect(closeModal).toHaveBeenCalled()
    expect(screen.queryByTestId("sheet")).toBeNull()
  })
})
