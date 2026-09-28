import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { Composer } from "../Composer"
import type { ConversationDTO, SendInput } from "@/modules/inbox/domain/inbox"
import { useWindowRejections } from "@/modules/inbox/infrastructure/hooks/use-reply-window"

const showAlert = jest.fn()
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert }) }))
jest.mock("@/modules/channels/public", () => ({ useChannelStatus: () => "connected" }))
jest.mock("../QuickActionsMenu", () => ({ QuickActionsMenu: ({ children }: { children: ReactNode }) => children }))
jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  uploadConversationFile: jest.fn(async (_c: string, file: File) => ({ id: `up-${file.name}` })),
  sendMessageRest: jest.fn(),
}))

// El grabador real necesita MediaRecorder: aquí basta su estado y sus mandos.
const recorder = {
  status: "idle" as string,
  supported: true,
  elapsedMs: 0,
  levels: [] as number[],
  recording: null as null | { object_url: string },
  start: jest.fn(),
  stop: jest.fn(),
  cancel: jest.fn(),
  reset: jest.fn(),
}
jest.mock("@/modules/inbox/infrastructure/hooks/use-voice-recorder", () => ({
  useVoiceRecorder: () => recorder,
  LEVEL_HISTORY: 48,
  MAX_RECORDING_MS: 300_000,
}))

const NOW = Date.parse("2026-09-27T15:00:00Z")
const H = 60 * 60 * 1000
const conv = (lastInboundAgoMs: number): ConversationDTO =>
  ({
    id: "c1",
    status: "open",
    mode: "human_active",
    channel_id: "ch1",
    channel: { id: "ch1", name: "WhatsApp Ventas", kind: "whatsapp_cloud" },
    last_inbound_at: new Date(NOW - lastInboundAgoMs).toISOString(),
    contact: { id: "k1", full_name: "Laura Gómez", phone: null, avatar_url: null },
  }) as unknown as ConversationDTO

const commands = { typing: jest.fn(), sendMessage: jest.fn() } as never

beforeEach(() => {
  showAlert.mockClear()
  recorder.cancel.mockClear()
  recorder.reset.mockClear()
  recorder.status = "idle"
  recorder.recording = null
  useWindowRejections.setState({ byConversation: {} })
})
afterEach(() => jest.useRealTimers())

describe("Composer — la voz no queda grabando sin control (auditoría F3-H1)", () => {
  it("si la ventana se cierra con el tick en plena grabación, se cancela y se dice por qué", () => {
    jest.useFakeTimers({ now: NOW })
    recorder.status = "recording"
    render(<Composer conversation={conv(24 * H - 30_000)} commands={commands} socketConnected onSend={jest.fn()} />)
    expect(recorder.cancel).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(60_000)
    })
    expect(recorder.cancel).toHaveBeenCalledTimes(1)
    expect(showAlert).toHaveBeenCalledWith({ tone: "info", title: "Se descartó la nota de voz: la ventana de 24 h se cerró" })
  })

  it("si la devuelven a Axi con la nota lista, se descarta la nota (no queda para cuando se reabra)", () => {
    jest.useFakeTimers({ now: NOW })
    recorder.status = "preview"
    recorder.recording = { object_url: "blob:x" }
    const { rerender } = render(<Composer conversation={conv(H)} commands={commands} socketConnected onSend={jest.fn()} />)
    expect(recorder.reset).not.toHaveBeenCalled()
    rerender(<Composer conversation={{ ...conv(H), mode: "ai_active" }} commands={commands} socketConnected onSend={jest.fn()} />)
    expect(recorder.reset).toHaveBeenCalledTimes(1)
    expect(showAlert).toHaveBeenCalledWith({ tone: "info", title: "Se descartó la nota de voz: la conversación ya no está contigo" })
  })

  it("mientras se puede escribir, grabar no dispara nada", () => {
    jest.useFakeTimers({ now: NOW })
    recorder.status = "recording"
    render(<Composer conversation={conv(H)} commands={commands} socketConnected onSend={jest.fn()} />)
    act(() => {
      jest.advanceTimersByTime(120_000)
    })
    expect(recorder.cancel).not.toHaveBeenCalled()
  })
})

describe("Composer — varios adjuntos fuera de ventana (auditoría F3-H2)", () => {
  it("si el servidor cierra la ventana con el primero, no intenta los siguientes", async () => {
    global.URL.createObjectURL = jest.fn(() => "blob:x")
    const c = conv(H)
    const onSend = jest.fn<Promise<void>, [SendInput]>(async () => {
      // Lo que hace use-send-message al recibir channels/outside_service_window.
      useWindowRejections.getState().reject("c1", c.last_inbound_at)
    })
    render(<Composer conversation={c} commands={commands} socketConnected onSend={onSend} />)
    const files = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })]
    fireEvent.paste(screen.getByRole("textbox", { name: "Mensaje" }), { clipboardData: { files } })
    const send = screen.getByRole("button", { name: "Enviar mensaje" })
    await waitFor(() => expect(send).toBeEnabled())
    await act(async () => {
      fireEvent.click(send)
    })
    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    expect(onSend).toHaveBeenCalledTimes(1)
  })
})
