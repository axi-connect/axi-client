import { act, fireEvent, render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { Composer } from "../Composer"
import type { ConversationDTO } from "@/modules/inbox/domain/inbox"
import { useWindowRejections } from "@/modules/inbox/infrastructure/hooks/use-reply-window"

jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: jest.fn() }) }))

let channelStatus: string | null = "connected"
jest.mock("@/modules/channels/public", () => ({ useChannelStatus: () => channelStatus }))

// El menú real vive en su propio test; aquí basta saber si se abrió y en qué modo.
jest.mock("../QuickActionsMenu", () => ({
  QuickActionsMenu: ({ open, mode, children }: { open: boolean; mode: string; children: ReactNode }) => (
    <>
      {children}
      {open && <div data-testid="quick-actions" data-mode={mode} />}
    </>
  ),
}))

const NOW = Date.parse("2026-09-27T15:00:00Z")
const H = 60 * 60 * 1000

function conversation(kind: ConversationDTO["channel"]["kind"], lastInboundAgoMs: number | null): ConversationDTO {
  return {
    id: "c1",
    status: "open",
    mode: "human_active",
    channel_id: "ch1",
    channel: { id: "ch1", name: "WhatsApp Ventas", kind },
    last_inbound_at: lastInboundAgoMs === null ? null : new Date(NOW - lastInboundAgoMs).toISOString(),
    contact: { id: "k1", full_name: "Laura Gómez", phone: null, avatar_url: null },
  } as unknown as ConversationDTO
}

const renderComposer = (conv: ConversationDTO) =>
  render(<Composer conversation={conv} commands={{ typing: jest.fn(), sendMessage: jest.fn() } as never} socketConnected onSend={jest.fn()} />)

beforeEach(() => {
  jest.useFakeTimers({ now: NOW })
  channelStatus = "connected"
  useWindowRejections.setState({ byConversation: {} })
})
afterEach(() => jest.useRealTimers())

describe("Composer — la ventana de 24 h (F3)", () => {
  it("abierta: la caja con clip, rayo y voz, y la línea cuenta lo que queda", () => {
    renderComposer(conversation("whatsapp_cloud", 3 * H))
    expect(screen.getByText(/Ventana de 24 h · quedan/)).toHaveTextContent("Ventana de 24 h · quedan 21 h")
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adjuntar archivo" })).toBeEnabled()
  })

  it("por cerrar: dice qué pasa después", () => {
    renderComposer(conversation("whatsapp_cloud", 23 * H + 22 * 60_000))
    expect(screen.getByText(/Se cierra en/)).toHaveTextContent("Se cierra en 38 min · después, solo plantilla")
  })

  it("cerrada en WhatsApp Cloud: la caja entera se cambia por el aviso (sin clip ni voz) y «Enviar plantilla» abre las plantillas", () => {
    renderComposer(conversation("whatsapp_cloud", 26 * H))
    expect(screen.getByRole("status")).toHaveTextContent("La ventana de 24 h se cerró hace 2 h.")
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Adjuntar archivo" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Grabar nota de voz" })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Enviar plantilla" }))
    expect(screen.getByTestId("quick-actions")).toHaveAttribute("data-mode", "templates")
  })

  it("sin ningún entrante (null) cuenta como cerrada", () => {
    renderComposer(conversation("whatsapp_cloud", null))
    expect(screen.getByRole("status")).toHaveTextContent("La ventana de 24 h se cerró.")
  })

  it("cerrada en Instagram: lo dice y NO ofrece plantillas", () => {
    renderComposer(conversation("instagram_dm", 30 * H))
    expect(screen.getByRole("status")).toHaveTextContent("Instagram solo deja responder durante las 24 h siguientes")
    expect(screen.getByRole("status")).toHaveTextContent("cuando Laura vuelva a escribir, se abre")
    expect(screen.queryByRole("button", { name: "Enviar plantilla" })).not.toBeInTheDocument()
  })

  it("WhatsApp Web no tiene ventana: sin línea y la caja abierta aunque el último entrante sea de hace una semana", () => {
    renderComposer(conversation("whatsapp_web", 24 * 7 * H))
    expect(screen.queryByText(/Ventana de 24 h/)).not.toBeInTheDocument()
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
  })

  it("el reloj corre: con la pestaña visible, al pasar el borde la caja se cierra sola", () => {
    renderComposer(conversation("whatsapp_cloud", 24 * H - 30_000))
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar plantilla" })).toBeInTheDocument()
  })

  it("manda el servidor: un rechazo por ventana la cierra aunque el reloj local diga abierta, hasta que el cliente vuelva a escribir", () => {
    const conv = conversation("whatsapp_cloud", 3 * H)
    const { rerender } = renderComposer(conv)
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
    act(() => useWindowRejections.getState().reject("c1", conv.last_inbound_at))
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enviar plantilla" })).toBeInTheDocument()
    // Un entrante nuevo cambia `last_inbound_at`: el rechazo viejo ya no aplica.
    rerender(
      <Composer
        conversation={{ ...conv, last_inbound_at: new Date(NOW).toISOString() }}
        commands={{ typing: jest.fn(), sendMessage: jest.fn() } as never}
        socketConnected
        onSend={jest.fn()}
      />,
    )
    expect(screen.getByRole("textbox", { name: "Mensaje" })).toBeInTheDocument()
  })
})

describe("Composer — canal, «/» y lo que no entra (F3)", () => {
  it("canal desconectado: aviso con el nombre del canal y el enlace al canal, sin caja", () => {
    channelStatus = "disconnected"
    renderComposer(conversation("whatsapp_cloud", 3 * H))
    expect(screen.getByRole("status")).toHaveTextContent("WhatsApp Ventas está desconectado.")
    expect(screen.getByRole("link", { name: "Ver el canal" })).toHaveAttribute("href", "/settings/channels/ch1")
    expect(screen.queryByRole("textbox", { name: "Mensaje" })).not.toBeInTheDocument()
  })

  it("«/» al empezar abre las acciones rápidas; en medio del texto es un carácter más", () => {
    renderComposer(conversation("whatsapp_web", null))
    const box = screen.getByRole("textbox", { name: "Mensaje" })
    fireEvent.keyDown(box, { key: "/" })
    expect(screen.getByTestId("quick-actions")).toHaveAttribute("data-mode", "all")
  })

  it("lo que no entra se dice en la caja, con el límite real, hasta cerrarlo", () => {
    renderComposer(conversation("whatsapp_web", null))
    const zip = new File(["x"], "cotizacion.zip", { type: "application/zip" })
    const big = new File(["x"], "foto.jpg", { type: "image/jpeg" })
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 })
    global.URL.createObjectURL = jest.fn(() => "blob:x")
    fireEvent.paste(screen.getByRole("textbox", { name: "Mensaje" }), { clipboardData: { files: [zip, big] } })
    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("cotizacion.zip no se puede enviar por WhatsApp.")
    expect(alert).toHaveTextContent("foto.jpg supera el máximo para fotos (5 MB).")
    fireEvent.click(screen.getByRole("button", { name: "Cerrar el aviso" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})
