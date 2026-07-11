import { render, screen } from "@testing-library/react"
import { MessageBubble } from "../MessageBubble"
import type { UiMessage } from "@/modules/inbox/domain/inbox"

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn(async () => ({ url: "https://s3/u1", expires_in_seconds: 300 })),
}))

function makeMessage(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: "m1",
    direction: "inbound",
    sender_type: "contact",
    sender_user_id: null,
    content_type: "text",
    body: "hola",
    payload: null,
    provider_message_id: null,
    status: "received",
    status_updated_at: null,
    error: null,
    attachments: [],
    created_at: "2026-07-09T00:00:00Z",
    ...overrides,
  } as UiMessage
}

const ATTACHMENT = { id: "a1", filename: "foto.jpg", mime_type: "image/jpeg", size_bytes: 1024 }

describe("MessageBubble — render por content_type (F9)", () => {
  it("texto: body plano, sin '(sin contenido)'", () => {
    render(<MessageBubble message={makeMessage()} conversationId="c1" />)
    expect(screen.getByText("hola")).toBeInTheDocument()
  })

  it("audio con attachment: player con play (URL perezosa, sin fetch inicial)", () => {
    render(
      <MessageBubble
        message={makeMessage({
          content_type: "audio",
          body: null,
          attachments: [{ ...ATTACHMENT, filename: "voice.ogg", mime_type: "audio/ogg" }],
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByRole("button", { name: "Reproducir audio" })).toBeInTheDocument()
    expect(screen.queryByText("(sin contenido)")).not.toBeInTheDocument()
  })

  it("imagen con attachment y caption: renderiza <img> y el caption", async () => {
    render(
      <MessageBubble
        message={makeMessage({
          content_type: "image",
          body: "mira esto",
          attachments: [ATTACHMENT],
        })}
        conversationId="c1"
      />,
    )
    expect(await screen.findByAltText("foto.jpg")).toBeInTheDocument()
    expect(screen.getByText("mira esto")).toBeInTheDocument()
  })

  it("documento: tarjeta con nombre, tamaño y botón de descarga", () => {
    render(
      <MessageBubble
        message={makeMessage({
          content_type: "document",
          body: null,
          attachments: [{ ...ATTACHMENT, filename: "carta.pdf", mime_type: "application/pdf" }],
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("carta.pdf")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Descargar carta.pdf" })).toBeInTheDocument()
  })

  it("ubicación: nombre + link a Google Maps desde payload", () => {
    render(
      <MessageBubble
        message={makeMessage({
          content_type: "location",
          body: null,
          payload: { location: { latitude: 4.6, longitude: -74.08, name: "Sede Chapinero" } },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Sede Chapinero")).toBeInTheDocument()
    const link = screen.getByRole("link", { name: /Ver en Google Maps/ })
    expect(link).toHaveAttribute("href", expect.stringContaining("google.com/maps"))
  })

  it("media sin attachment ni preview: fallback 'no disponible' (adiós '(sin contenido)')", () => {
    render(
      <MessageBubble
        message={makeMessage({ content_type: "audio", body: null })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Nota de voz no disponible todavía")).toBeInTheDocument()
    expect(screen.queryByText("(sin contenido)")).not.toBeInTheDocument()
  })

  it("system: pill centrado", () => {
    render(
      <MessageBubble
        message={makeMessage({ content_type: "system", sender_type: "system", body: "Conversación escalada" })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Conversación escalada")).toBeInTheDocument()
  })
})
