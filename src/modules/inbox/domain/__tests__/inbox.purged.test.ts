import { isAttachmentMessage, isAttachmentPurged, purgedAttachmentLine, type UiMessage } from "../inbox"

function message(attachments: { purged_at?: string | null }[]): UiMessage {
  return {
    id: "m1",
    content_type: "image",
    attachments: attachments.map((a, i) => ({ id: `a${i}`, filename: "f.jpg", mime_type: "image/jpeg", size_bytes: 1, ...a })),
  } as unknown as UiMessage
}

describe("adjuntos depurados", () => {
  it("purged_at con fecha es depurado; null o ausente (evento WS viejo) no", () => {
    expect(isAttachmentPurged({ purged_at: "2026-10-08T00:00:00Z" })).toBe(true)
    expect(isAttachmentPurged({ purged_at: null })).toBe(false)
    expect(isAttachmentPurged({})).toBe(false)
    expect(isAttachmentPurged(undefined)).toBe(false)
  })

  it("la línea de la burbuja: tipo, peso y fecha", () => {
    expect(purgedAttachmentLine("audio", "2 MB", "2026-10-08T15:00:00Z")).toBe("Audio de 2 MB · depurado el 8 oct")
    expect(purgedAttachmentLine("document", "", "x")).toBe("Documento · depurado")
  })

  it("lo depurado sale del panel de adjuntos; lo vivo se queda", () => {
    expect(isAttachmentMessage(message([{ purged_at: "2026-10-08T00:00:00Z" }]))).toBe(false)
    expect(isAttachmentMessage(message([{ purged_at: null }]))).toBe(true)
  })
})
