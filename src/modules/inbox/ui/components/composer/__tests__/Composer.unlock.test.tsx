import { fireEvent, render, screen } from "@testing-library/react"
import { Hand } from "lucide-react"
import { Composer } from "../Composer"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }))
jest.mock("../QuickActionsMenu", () => ({ QuickActionsMenu: () => null }))
jest.mock("../AttachmentPicker", () => ({ AttachmentPicker: () => null }))

const conversation = (mode: ConversationDTO["mode"]) =>
  ({ id: "c1", status: "open", mode, contact: { full_name: "Mariana", phone: null } }) as unknown as ConversationDTO

describe("Composer — la barra cuando todavía no se puede escribir (F2)", () => {
  it("con Axi atendiendo: explica la pausa y «Intervenir» abre la escritura; no hay caja de texto", () => {
    const onSelect = jest.fn()
    render(
      <Composer conversation={conversation("ai_active")} commands={{} as never} socketConnected onSend={jest.fn()} unlock={{ id: "takeover", label: "Intervenir", icon: Hand, onSelect }} />,
    )
    expect(screen.getByRole("status")).toHaveTextContent("Axi está atendiendo. Si intervienes, Axi se pausa")
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Intervenir" }))
    expect(onSelect).toHaveBeenCalled()
  })

  it("en cola sin permiso: solo la frase, sin botón", () => {
    render(<Composer conversation={conversation("human_queued")} commands={{} as never} socketConnected onSend={jest.fn()} unlock={null} />)
    expect(screen.getByRole("status")).toHaveTextContent("Atiéndela para responder. Axi ya no le escribe.")
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("atendida por ti: la caja de texto de siempre", () => {
    render(<Composer conversation={conversation("human_active")} commands={{ typing: jest.fn() } as never} socketConnected onSend={jest.fn()} />)
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
  })
})
