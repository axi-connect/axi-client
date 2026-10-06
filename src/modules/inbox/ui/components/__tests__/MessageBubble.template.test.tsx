import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MessageBubble } from "../MessageBubble"
import type { UiMessage } from "@/modules/inbox/domain/inbox"
import { resetChannelTemplatesCache } from "@/modules/inbox/infrastructure/hooks/use-channel-templates"
import { listHsmTemplates } from "@/modules/marketing/public"

jest.mock("@/modules/inbox/infrastructure/services/inbox-service.adapter", () => ({
  getAttachmentUrl: jest.fn(),
}))
jest.mock("@/modules/marketing/public", () => ({
  ...jest.requireActual("@/modules/marketing/public"),
  listHsmTemplates: jest.fn(),
}))

const listMock = listHsmTemplates as jest.MockedFunction<typeof listHsmTemplates>

// La plantilla y el payload del incidente del 2026-09-29 (el texto del catálogo es de ejemplo).
const CATALOG = [
  {
    id: "t1",
    channel_id: "ch1",
    name: "sesion_en_vivo_v2",
    language: "es_CO",
    body: "Hola {{1}}, vi que en {{2}} están mirando cómo vender por WhatsApp. Te comparto {{3}} para el {{4}}.",
    components: [
      { type: "BODY", text: "Hola {{1}}…" },
      { type: "FOOTER", text: "Responde SALIR si no quieres más mensajes" },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Sí, resérvame" }, { type: "QUICK_REPLY", text: "Ahora no" }] },
    ],
  },
] as unknown as Awaited<ReturnType<typeof listHsmTemplates>>

const PAYLOAD = {
  template: {
    name: "sesion_en_vivo_v2",
    language: "es_CO",
    components: [
      {
        type: "body",
        parameters: [
          { type: "text", text: "Cristian" },
          { type: "text", text: "Kodecol" },
          { type: "text", text: "la lista de planes con precios" },
          { type: "text", text: "30 de septiembre" },
        ],
      },
    ],
  },
}

function templateMessage(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: "m1",
    direction: "outbound",
    sender_type: "system",
    sender_user_id: null,
    content_type: "template",
    body: null,
    payload: PAYLOAD,
    provider_message_id: "wamid.x",
    status: "read",
    status_updated_at: null,
    error: null,
    attachments: [],
    created_at: "2026-09-29T21:05:00Z",
    ...overrides,
  } as UiMessage
}

beforeEach(() => {
  resetChannelTemplatesCache()
  listMock.mockReset()
  listMock.mockResolvedValue(CATALOG)
})

describe("MessageBubble — plantilla de Meta (hotfix 2026-09-29)", () => {
  it("la apertura del CRM (sender system) es una burbuja con el texto y los datos, no la píldora vacía", async () => {
    render(<MessageBubble message={templateMessage()} conversationId="c1" channelId="ch1" />)

    expect(await screen.findByText("Kodecol")).toHaveClass("font-semibold")
    expect(screen.getByText("Plantilla · sesion_en_vivo_v2")).toBeInTheDocument()
    expect(screen.getByText(/están mirando cómo vender/)).toBeInTheDocument()
    expect(screen.getByText("Responde SALIR si no quieres más mensajes")).toBeInTheDocument()
    expect(screen.getByText("Sí, resérvame")).toBeInTheDocument()
    expect(screen.getByText("Leída")).toBeInTheDocument()
    expect(screen.queryByText("(sin contenido)")).not.toBeInTheDocument()
    expect(screen.queryByText("template")).not.toBeInTheDocument()
    expect(listMock).toHaveBeenCalledWith({ channel_id: "ch1" })
  })

  it("si la plantilla ya no está en Meta, lo dice y muestra los datos con que salió", async () => {
    listMock.mockResolvedValue([])
    render(<MessageBubble message={templateMessage({ status: "delivered" })} conversationId="c1" channelId="ch1" />)

    expect(await screen.findByText(/Ya no está en tus plantillas de Meta/)).toBeInTheDocument()
    expect(screen.getByText("la lista de planes con precios")).toBeInTheDocument()
    expect(screen.getByText("Entregada")).toBeInTheDocument()
  })

  it("rechazada por Meta: dice por qué y «Reenviar» llama al reenvío", async () => {
    const onResend = jest.fn(async () => {})
    const failed = templateMessage({
      status: "failed",
      error: { code: 131042, title: "Business eligibility payment issue", details: "payment method" },
    })
    render(<MessageBubble message={failed} conversationId="c1" channelId="ch1" onResend={onResend} />)

    expect(screen.getByText("No llegó.")).toBeInTheDocument()
    expect(screen.getByText(/método de pago de tu cuenta de WhatsApp Business/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Reenviar/ }))
    expect(onResend).toHaveBeenCalledWith(failed)
    await waitFor(() => expect(screen.getByRole("button", { name: /Reenviar/ })).toBeEnabled())
  })

  it("hotfix 131049: Meta pidió esperar → sin «Reenviar», con el motivo y desde cuándo", () => {
    const failed = templateMessage({ status: "failed", error: { code: 131049, title: "healthy ecosystem" } })
    render(
      <MessageBubble
        message={failed}
        conversationId="c1"
        channelId="ch1"
        onResend={jest.fn(async () => {})}
        resendWaitUntil="2026-10-07T16:04:08Z"
        timeZone="America/Bogota"
      />,
    )
    expect(screen.getByText(/tope de mensajes de marketing/)).toBeInTheDocument()
    expect(screen.getByText(/Podrás reenviarlo desde el/)).toBeInTheDocument()
    expect(screen.getByText(/mié 7 oct · 11:04 a\. m\./)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument()
  })

  it("ya reenviada: sin botón, con la hora del reenvío", () => {
    render(
      <MessageBubble
        message={templateMessage({ status: "failed" })}
        conversationId="c1"
        channelId="ch1"
        onResend={jest.fn(async () => {})}
        resentAt="2026-09-29T21:12:00Z"
      />,
    )
    expect(screen.getByText(/Se reenvió a las/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument()
  })

  it("una plantilla entregada no ofrece reenviar ni dice «No llegó»", async () => {
    render(<MessageBubble message={templateMessage({ status: "delivered" })} conversationId="c1" channelId="ch1" onResend={jest.fn(async () => {})} />)
    await screen.findByText("Kodecol")
    expect(screen.queryByText("No llegó.")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument()
  })

  it("M4: un saliente ya reconciliado que Meta rechaza DESPUÉS va a «Reenviar», no a «Reintentar»", () => {
    const reconciled = {
      ...templateMessage({
        id: "real-1",
        content_type: "text",
        body: "hola",
        payload: null,
        sender_type: "user",
        status: "failed",
        error: { code: "131026" },
      }),
      local_id: "local-1",
      delivery: "failed" as const,
    }
    render(<MessageBubble message={reconciled} conversationId="c1" onRetry={jest.fn()} onResend={jest.fn(async () => {})} />)
    expect(screen.getByText("No llegó.")).toBeInTheDocument()
    expect(screen.getByText(/no pudo recibir el mensaje/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Reenviar/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Reintentar envío" })).not.toBeInTheDocument()
  })

  it("un optimista local que no salió sigue con «Reintentar», no con «Reenviar»", () => {
    const local = {
      ...templateMessage({ id: "l1", content_type: "text", body: "hola", payload: null, sender_type: "user", status: "failed" }),
      local_id: "l1",
      delivery: "failed" as const,
    }
    render(<MessageBubble message={local} conversationId="c1" onRetry={jest.fn()} onResend={jest.fn(async () => {})} />)
    expect(screen.getByRole("button", { name: "Reintentar envío" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument()
  })
})
