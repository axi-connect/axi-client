import { render, screen } from "@testing-library/react"
import { MediaAttachment } from "../MediaAttachment"
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
    content_type: "image",
    body: null,
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

describe("MediaAttachment — media sin attachment", () => {
  it("con media_pending muestra el skeleton (no el error)", () => {
    render(
      <MediaAttachment
        message={makeMessage({ media_pending: true })}
        conversationId="c1"
        outbound={false}
      />,
    )
    expect(screen.getByLabelText("Cargando adjunto")).toBeInTheDocument()
    expect(screen.queryByText(/no disponible todavía/i)).not.toBeInTheDocument()
  })

  it("sin media_pending (reintentos agotados) muestra 'no disponible todavía'", () => {
    render(
      <MediaAttachment message={makeMessage()} conversationId="c1" outbound={false} />,
    )
    expect(screen.getByText(/no disponible todavía/i)).toBeInTheDocument()
  })
})
