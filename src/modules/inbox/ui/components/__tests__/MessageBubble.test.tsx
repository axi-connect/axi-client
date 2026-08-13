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

describe("MessageBubble — mensajes interactivos", () => {
  const OPTIONS = {
    kind: "options",
    body: "¿Confirmas el pedido?",
    options: [
      { id: "opt:si", title: "Sí, confirmar" },
      { id: "opt:no", title: "No" },
    ],
  }

  it("saliente: pinta el cuerpo Y las opciones (antes se perdían)", () => {
    // Sin esta rama el mensaje salía como una burbuja con el literal
    // "INTERACTIVE" y los botones desaparecían del historial
    render(
      <MessageBubble
        message={makeMessage({
          direction: "outbound",
          sender_type: "ai_agent",
          content_type: "interactive",
          body: "¿Confirmas el pedido?",
          payload: { interactive: OPTIONS },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("¿Confirmas el pedido?")).toBeInTheDocument()
    expect(screen.getByText("Sí, confirmar")).toBeInTheDocument()
    expect(screen.getByText("No")).toBeInTheDocument()
    expect(screen.queryByText("interactive")).not.toBeInTheDocument()
  })

  it("las opciones son vista, no control: nada tocable que responda por el cliente", () => {
    render(
      <MessageBubble
        message={makeMessage({
          direction: "outbound",
          content_type: "interactive",
          body: "¿Confirmas?",
          payload: { interactive: OPTIONS },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.queryByRole("button", { name: "Sí, confirmar" })).not.toBeInTheDocument()
  })

  it("con descripciones se anuncia como menú y las muestra", () => {
    render(
      <MessageBubble
        message={makeMessage({
          direction: "outbound",
          content_type: "interactive",
          body: "Elige un producto",
          payload: {
            interactive: {
              kind: "options",
              body: "Elige un producto",
              menu_label: "Ver productos",
              options: [
                { id: "sku:A", title: "Camiseta", description: "$35.000 COP" },
                { id: "sku:B", title: "Buzo", description: "$89.000 COP" },
              ],
            },
          },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Ver productos")).toBeInTheDocument()
    expect(screen.getByText("$35.000 COP")).toBeInTheDocument()
  })

  it("cta_url: enlace real que abre en pestaña nueva", () => {
    render(
      <MessageBubble
        message={makeMessage({
          direction: "outbound",
          content_type: "interactive",
          body: "Paga en línea",
          payload: {
            interactive: {
              kind: "cta_url",
              body: "Paga en línea",
              label: "Pagar",
              url: "https://pagos.example.com/1",
            },
          },
        })}
        conversationId="c1"
      />,
    )
    const link = screen.getByRole("link", { name: /Pagar/ })
    expect(link).toHaveAttribute("href", "https://pagos.example.com/1")
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
  })

  it("payload inválido: cae a texto plano, la burbuja nunca queda muda", () => {
    render(
      <MessageBubble
        message={makeMessage({
          direction: "outbound",
          content_type: "interactive",
          body: "Elige",
          payload: { interactive: { kind: "options", body: "Elige", options: "roto" } },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Elige")).toBeInTheDocument()
  })

  it("entrante: chip que distingue el toque de un texto tecleado", () => {
    render(
      <MessageBubble
        message={makeMessage({
          body: "Sí, confirmar",
          payload: { interactive_reply: { id: "opt:si", title: "Sí, confirmar", source: "button" } },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Botón")).toBeInTheDocument()
    expect(screen.getByText("Sí, confirmar")).toBeInTheDocument()
  })

  it("entrante numérico: explica que respondió a una lista degradada", () => {
    render(
      <MessageBubble
        message={makeMessage({
          body: "2",
          payload: {
            interactive_reply: { id: "slot:x", title: "vie 14 a las 10:00", source: "numeric" },
          },
        })}
        conversationId="c1"
      />,
    )
    expect(screen.getByText("Respondió con el número")).toBeInTheDocument()
  })
})
