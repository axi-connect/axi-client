import {
  attachmentCategory,
  attachmentDisplayName,
  extractCatalogSku,
  extractInteractivePayload,
  extractInteractiveReply,
  extractLocationPayload,
  extractTranscription,
  isAttachmentMessage,
  isAwaitingReply,
  isNotablePriority,
  parsePreview,
  waitingSince,
  type ConversationDTO,
  type UiMessage,
} from "../inbox"

describe("parsePreview (tokens de media del backend)", () => {
  it.each([
    ["[image]", "Foto", "image"],
    ["[audio]", "Nota de voz", "audio"],
    ["[video]", "Video", "video"],
    ["[document]", "Documento", "document"],
    ["[sticker]", "Sticker", "sticker"],
    ["[location]", "Ubicación", "location"],
  ])("%s → %s", (token, label, kind) => {
    expect(parsePreview(token)).toEqual({ kind, text: label })
  })

  it("texto normal pasa tal cual, sin icono", () => {
    expect(parsePreview("hola, ¿cómo van?")).toEqual({ kind: null, text: "hola, ¿cómo van?" })
  })

  it("null → puntos suspensivos", () => {
    expect(parsePreview(null)).toEqual({ kind: null, text: "…" })
  })

  it("un token desconocido no rompe (queda como texto)", () => {
    expect(parsePreview("[template]")).toEqual({ kind: null, text: "[template]" })
  })

  it("audio transcrito (🎤 <texto>) → icono audio + texto sin emoji", () => {
    expect(parsePreview("🎤 quiero dos pizzas")).toEqual({ kind: "audio", text: "quiero dos pizzas" })
  })
})

describe("extractTranscription", () => {
  it("transcripción done con texto", () => {
    expect(
      extractTranscription({
        media: { id: "x" },
        transcription: {
          status: "done",
          text: "quiero dos pizzas",
          provider: "groq",
          model: "whisper-large-v3-turbo",
          audio_seconds: 4.2,
          latency_ms: 900,
          transcribed_at: "2026-07-16T00:00:00Z",
        },
      }),
    ).toEqual({
      status: "done",
      text: "quiero dos pizzas",
      provider: "groq",
      model: "whisper-large-v3-turbo",
      audio_seconds: 4.2,
      latency_ms: 900,
      transcribed_at: "2026-07-16T00:00:00Z",
    })
  })

  it("transcripción failed (sin texto)", () => {
    expect(extractTranscription({ transcription: { status: "failed" } })).toEqual({ status: "failed" })
  })

  it("payload sin transcripción o malformado → null", () => {
    expect(extractTranscription(null)).toBeNull()
    expect(extractTranscription({})).toBeNull()
    expect(extractTranscription({ transcription: { status: "pending" } })).toBeNull()
    expect(extractTranscription({ transcription: { status: "done" } })).toBeNull() // done sin text
  })
})

describe("extractLocationPayload", () => {
  it("payload válido del backend", () => {
    expect(
      extractLocationPayload({ location: { latitude: 4.6, longitude: -74.08, address: "Cra 7" } }),
    ).toEqual({ latitude: 4.6, longitude: -74.08, name: undefined, address: "Cra 7" })
  })

  it("payload malformado → null (no revienta el render)", () => {
    expect(extractLocationPayload(null)).toBeNull()
    expect(extractLocationPayload({})).toBeNull()
    expect(extractLocationPayload({ location: { latitude: "4.6" } })).toBeNull()
  })
})

describe("extractCatalogSku (foto de catálogo enviada por la IA, F16)", () => {
  it("payload con media.catalog_sku → sku", () => {
    expect(extractCatalogSku({ media: { catalog_sku: "CAM-R-M" } })).toBe("CAM-R-M")
  })

  it("payload sin sku o malformado → null (no revienta el render)", () => {
    expect(extractCatalogSku(null)).toBeNull()
    expect(extractCatalogSku({})).toBeNull()
    expect(extractCatalogSku({ media: {} })).toBeNull()
    expect(extractCatalogSku({ media: { catalog_sku: 42 } })).toBeNull()
    expect(extractCatalogSku({ media: { catalog_sku: "  " } })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Adjuntos del hilo (rail de contexto): el panel se deriva del store, así que
// el predicado es lo único que decide qué archivo se lista y qué se ignora.
// ---------------------------------------------------------------------------

function message(overrides: Partial<UiMessage> = {}): UiMessage {
  return {
    id: "m1",
    direction: "inbound",
    sender_type: "contact",
    sender_user_id: null,
    content_type: "text",
    body: null,
    payload: null,
    provider_message_id: null,
    status: "received",
    status_updated_at: null,
    error: null,
    attachments: [],
    created_at: "2026-07-28T10:00:00.000Z",
    ...overrides,
  } as UiMessage
}

const attachment = { id: "a1", filename: "foto.jpg", mime_type: "image/jpeg", size_bytes: 1024 }

describe("isAttachmentMessage", () => {
  it("ignora texto sin adjuntos", () => {
    expect(isAttachmentMessage(message({ body: "hola" }))).toBe(false)
  })

  it("lista un mensaje con attachments persistidos", () => {
    expect(
      isAttachmentMessage(message({ content_type: "image", attachments: [attachment] })),
    ).toBe(true)
  })

  it("lista el optimista que aún solo tiene preview local", () => {
    expect(
      isAttachmentMessage(
        message({
          content_type: "image",
          local_previews: [
            { object_url: "blob:x", mime_type: "image/jpeg", filename: "f.jpg", size_bytes: 10 },
          ],
        }),
      ),
    ).toBe(true)
  })

  it("lista media entrante cuyo attachment aún no materializa el backend", () => {
    expect(isAttachmentMessage(message({ content_type: "audio", media_pending: true }))).toBe(true)
  })

  it("excluye location: no hay archivo que descargar", () => {
    expect(isAttachmentMessage(message({ content_type: "location" }))).toBe(false)
  })

  it("excluye location incluso si trajera attachments", () => {
    expect(
      isAttachmentMessage(message({ content_type: "location", attachments: [attachment] })),
    ).toBe(false)
  })
})

describe("attachmentCategory", () => {
  it.each([
    ["image", "image"],
    ["sticker", "image"],
    ["video", "video"],
    ["audio", "audio"],
    ["document", "document"],
  ] as const)("content_type %s → %s", (contentType, expected) => {
    expect(attachmentCategory(message({ content_type: contentType }))).toBe(expected)
  })

  it("cae al mime del adjunto cuando el content_type no es media", () => {
    expect(
      attachmentCategory(
        message({
          content_type: "template",
          attachments: [{ ...attachment, mime_type: "image/png" }],
        }),
      ),
    ).toBe("image")
  })

  it("mime desconocido cae a documento (nunca deja el adjunto fuera de todo filtro)", () => {
    expect(
      attachmentCategory(
        message({
          content_type: "template",
          attachments: [{ ...attachment, mime_type: "application/x-rar" }],
        }),
      ),
    ).toBe("document")
  })
})

describe("attachmentDisplayName", () => {
  // Caso real: WhatsApp manda como `filename` el JSON de media en base64url.
  const WHATSAPP_TOKEN =
    "eyJraW5kIjoiaW1hZ2UiLCJ1cmwiOiJodHRwczovL21tZy53aGF0c2FwcC5uZXQvbzEvdi90MjQvZjIvbTIzNS9BUU5zalpPRk9UbWM2MmFzVjFCTDVEczF2eUZNMzM0dWljdWlMeEY2dzNPLUYxbGtaY2FDbERMSmctSUJxTGhzbElfb25BbmdSVi1kekQ5UlZCem12Tld2VnQ2VGZrWkdUZmg0eklOcWtRIiwibWltZV90eXBlIjoiaW1hZ2UvanBlZyJ9"

  it("sustituye el token base64 de WhatsApp por un nombre legible", () => {
    expect(
      attachmentDisplayName({ filename: WHATSAPP_TOKEN, mime_type: "image/jpeg" }),
    ).toBe("Foto.jpg")
  })

  it("el resultado es corto: es lo que evita que la modal se ensanche", () => {
    const name = attachmentDisplayName({ filename: WHATSAPP_TOKEN, mime_type: "image/jpeg" })
    expect(name.length).toBeLessThan(30)
  })

  it("respeta un nombre real tal cual", () => {
    expect(
      attachmentDisplayName({ filename: "cotizacion-final.pdf", mime_type: "application/pdf" }),
    ).toBe("cotizacion-final.pdf")
  })

  it("respeta nombres con espacios y acentos", () => {
    expect(
      attachmentDisplayName({ filename: "Diseño propuesta v2.png", mime_type: "image/png" }),
    ).toBe("Diseño propuesta v2.png")
  })

  it("compone nombre cuando el proveedor no manda ninguno", () => {
    expect(attachmentDisplayName({ filename: "", mime_type: "video/mp4" })).toBe("Video.mp4")
    expect(attachmentDisplayName({ filename: "   ", mime_type: "audio/ogg" })).toBe(
      "Nota de voz.ogg",
    )
    expect(attachmentDisplayName({ filename: "", mime_type: "application/pdf" })).toBe(
      "Documento.pdf",
    )
  })

  it("normaliza extensiones raras del mime", () => {
    expect(attachmentDisplayName({ filename: "", mime_type: "video/quicktime" })).toBe("Video.mov")
    expect(attachmentDisplayName({ filename: "", mime_type: "image/svg+xml" })).toBe("Foto.svg")
    expect(
      attachmentDisplayName({
        filename: "",
        mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
    ).toBe("Documento.document")
  })

  it("sin mime utilizable devuelve solo la etiqueta", () => {
    expect(attachmentDisplayName({ filename: "", mime_type: "" })).toBe("Documento")
  })

  it("recorta nombres reales absurdamente largos", () => {
    const long = `${"a".repeat(200)}.jpg`
    expect(attachmentDisplayName({ filename: long, mime_type: "image/jpeg" })).toBe("Foto.jpg")
  })

  it("no confunde un nombre corto sin extensión con un token", () => {
    expect(attachmentDisplayName({ filename: "README", mime_type: "text/plain" })).toBe("README")
  })
})

// ---------------------------------------------------------------------------
// Señales de la cabecera del chat: derivadas del DTO, sin peticiones extra.
// ---------------------------------------------------------------------------

function conversation(overrides: Partial<ConversationDTO> = {}): ConversationDTO {
  return {
    id: "conv-1",
    channel_id: "ch-1",
    contact_id: "c-1",
    status: "open",
    mode: "human_active",
    assigned_user_id: null,
    priority: "normal",
    unread_count: 0,
    last_message_at: null,
    last_inbound_at: null,
    last_message_preview: null,
    contact: { id: "c-1", full_name: "Cristian", phone: null, avatar_url: null },
    channel: { id: "ch-1", name: "WhatsApp", kind: "whatsapp_cloud" },
    created_at: "2026-07-28T10:00:00.000Z",
    updated_at: "2026-07-28T10:00:00.000Z",
    ...overrides,
  } as ConversationDTO
}

describe("isAwaitingReply", () => {
  it("espera si el último mensaje es el entrante", () => {
    expect(
      isAwaitingReply(
        conversation({
          last_inbound_at: "2026-07-28T12:00:00.000Z",
          last_message_at: "2026-07-28T12:00:00.000Z",
        }),
      ),
    ).toBe(true)
  })

  it("tolera el desfase de milisegundos entre ambos timestamps", () => {
    // El backend los escribe en operaciones distintas: comparar por igualdad
    // daría false para el mismo mensaje entrante.
    expect(
      isAwaitingReply(
        conversation({
          last_inbound_at: "2026-07-28T12:00:00.400Z",
          last_message_at: "2026-07-28T12:00:00.000Z",
        }),
      ),
    ).toBe(true)
  })

  it("no espera si ya respondimos después", () => {
    expect(
      isAwaitingReply(
        conversation({
          last_inbound_at: "2026-07-28T12:00:00.000Z",
          last_message_at: "2026-07-28T12:05:00.000Z",
        }),
      ),
    ).toBe(false)
  })

  it("no espera si nunca escribió", () => {
    expect(isAwaitingReply(conversation({ last_inbound_at: null }))).toBe(false)
  })

  it("espera si hay entrante pero el hilo no registra último mensaje", () => {
    expect(
      isAwaitingReply(
        conversation({ last_inbound_at: "2026-07-28T12:00:00.000Z", last_message_at: null }),
      ),
    ).toBe(true)
  })
})

describe("waitingSince", () => {
  it("devuelve el ISO del entrante cuando espera", () => {
    expect(
      waitingSince(
        conversation({
          last_inbound_at: "2026-07-28T12:00:00.000Z",
          last_message_at: "2026-07-28T12:00:00.000Z",
        }),
      ),
    ).toBe("2026-07-28T12:00:00.000Z")
  })

  it("null cuando no espera", () => {
    expect(
      waitingSince(
        conversation({
          last_inbound_at: "2026-07-28T12:00:00.000Z",
          last_message_at: "2026-07-28T12:05:00.000Z",
        }),
      ),
    ).toBeNull()
  })
})

describe("isNotablePriority", () => {
  it.each([
    ["urgent", true],
    ["high", true],
    ["normal", false],
    ["low", false],
  ] as const)("%s → %s", (priority, expected) => {
    expect(isNotablePriority(priority)).toBe(expected)
  })
})

describe("extractInteractivePayload", () => {
  it("lee un set de opciones con su etiqueta de menú", () => {
    expect(
      extractInteractivePayload({
        interactive: {
          kind: "options",
          body: "Elige",
          menu_label: "Ver horarios",
          options: [{ id: "slot:a", title: "vie 14", description: "10:00" }],
        },
      }),
    ).toEqual({
      kind: "options",
      body: "Elige",
      menu_label: "Ver horarios",
      options: [{ id: "slot:a", title: "vie 14", description: "10:00" }],
    })
  })

  it("lee un cta_url", () => {
    expect(
      extractInteractivePayload({
        interactive: { kind: "cta_url", body: "Paga", label: "Pagar", url: "https://x.co" },
      }),
    ).toEqual({ kind: "cta_url", body: "Paga", label: "Pagar", url: "https://x.co" })
  })

  it("descarta las opciones malformadas y conserva las buenas", () => {
    const parsed = extractInteractivePayload({
      interactive: {
        kind: "options",
        body: "Elige",
        options: [{ id: "a", title: "Uno" }, { id: 42 }, null, { title: "Sin id" }],
      },
    })
    expect(parsed).toMatchObject({ options: [{ id: "a", title: "Uno" }] })
  })

  it.each([
    ["null", null],
    ["sin interactive", { media: {} }],
    ["sin body", { interactive: { kind: "options", options: [{ id: "a", title: "b" }] } }],
    ["kind desconocido", { interactive: { kind: "flow", body: "x" } }],
    ["options no array", { interactive: { kind: "options", body: "x", options: "roto" } }],
    ["todas las opciones inválidas", { interactive: { kind: "options", body: "x", options: [1] } }],
    ["cta sin url", { interactive: { kind: "cta_url", body: "x", label: "y" } }],
  ])("devuelve null con %s (la burbuja cae a texto)", (_label, payload) => {
    expect(extractInteractivePayload(payload)).toBeNull()
  })
})

describe("extractInteractiveReply", () => {
  it("lee la respuesta normalizada por la ingesta", () => {
    expect(
      extractInteractiveReply({
        interactive_reply: { id: "opt:si", title: "Sí", source: "button" },
      }),
    ).toEqual({ id: "opt:si", title: "Sí", source: "button" })
  })

  it.each([
    ["null", null],
    ["sin la clave", { interactive: {} }],
    ["source desconocido", { interactive_reply: { id: "a", title: "b", source: "telepatia" } }],
    ["sin título", { interactive_reply: { id: "a", source: "button" } }],
  ])("devuelve null con %s", (_label, payload) => {
    expect(extractInteractiveReply(payload)).toBeNull()
  })
})
