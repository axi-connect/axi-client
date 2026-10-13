import { act, render, screen } from "@testing-library/react"
import { Composer } from "../Composer"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import { useStorageStore } from "@/modules/storage/infrastructure/stores/storage.store"

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }))
jest.mock("../QuickActionsMenu", () => ({ QuickActionsMenu: ({ children }: { children: React.ReactNode }) => children }))
jest.mock("@/modules/channels/public", () => ({ useChannelStatus: () => "connected" }))

const conversation = {
  id: "c1",
  status: "open",
  mode: "human_active",
  channel_id: "ch1",
  channel: { id: "ch1", name: "WhatsApp Ventas", kind: "whatsapp_web" },
  last_inbound_at: null,
  contact: { full_name: "Mariana", phone: null },
} as unknown as ConversationDTO

function renderComposer() {
  render(<Composer conversation={conversation} commands={{ typing: jest.fn() } as never} socketConnected onSend={jest.fn()} />)
}

describe("Composer — espacio lleno (control de almacenamiento T2)", () => {
  beforeEach(() => useStorageStore.getState().reset())

  it("con espacio el clip abre el selector como siempre", () => {
    renderComposer()
    const clip = screen.getByRole("button", { name: "Adjuntar archivo" })
    expect(clip).not.toHaveAttribute("aria-disabled")
    expect(clip).not.toBeDisabled()
  })

  it("lleno: el clip se apaga pero sigue enfocable (para su tooltip) y escribir sigue igual", () => {
    renderComposer()
    act(() => {
      useStorageStore.getState().onQuotaState({
        company_id: "x",
        state: "full",
        previous: "warning",
        pct_used: 100,
        used_bytes: 1,
        quota_bytes: 1,
        blocks_uploads: true,
      })
    })
    const clip = screen.getByRole("button", { name: "Adjuntar archivo" })
    expect(clip).toHaveAttribute("aria-disabled", "true")
    expect(clip).not.toBeDisabled()
    expect(screen.getByRole("textbox", { name: "Mensaje" })).not.toBeDisabled()
  })
})
