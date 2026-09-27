import {
  sendFacts,
  windowClosesAt,
  type DocumentSendOptionsDTO,
} from "@/modules/documents/domain/delivery";

const NOW = new Date("2026-09-17T18:00:00.000Z");

function options(
  whatsapp: Partial<DocumentSendOptionsDTO["whatsapp"]> = {},
  email: Partial<DocumentSendOptionsDTO["email"]> = {},
): DocumentSendOptionsDTO {
  return {
    contact: { id: "c1", display_name: "Laura Gómez" },
    whatsapp: {
      reachable: true,
      reason: null,
      window_open: true,
      last_inbound_at: "2026-09-17T15:00:00.000Z",
      window_hours: 24,
      fallback: "none",
      hsm_name: null,
      recipient_masked: "+57 ··· 0199",
      ...whatsapp,
    },
    email: { address_masked: "la···@example.com", ...email },
  };
}

describe("windowClosesAt", () => {
  it("último mensaje + las horas de la ventana, si ese cierre es futuro", () => {
    expect(
      windowClosesAt("2026-09-17T15:00:00.000Z", 24, NOW)?.toISOString(),
    ).toBe("2026-09-18T15:00:00.000Z");
    // Sin `window_hours` del servidor, 24.
    expect(
      windowClosesAt("2026-09-17T15:00:00.000Z", null, NOW)?.toISOString(),
    ).toBe("2026-09-18T15:00:00.000Z");
  });

  it("un cierre que ya pasó, o sin mensaje, no se cuenta: manda `window_open` del servidor", () => {
    expect(windowClosesAt("2026-08-01T00:00:00.000Z", 24, NOW)).toBeNull();
    expect(windowClosesAt(null, 24, NOW)).toBeNull();
    expect(windowClosesAt("no es fecha", 24, NOW)).toBeNull();
  });
});

describe("sendFacts (el resumen del diálogo «Enviar»)", () => {
  it("ventana abierta: el PDF al chat y hasta cuándo sigue abierta", () => {
    const facts = sendFacts(options(), "whatsapp", NOW);
    expect(facts[0]).toEqual({
      label: "Por WhatsApp",
      value: "el PDF le llega al chat, con una línea que lo presenta",
    });
    expect(facts[1]?.label).toBe("La ventana de 24 h");
    expect(facts[1]?.value).toMatch(/^abierta hasta el /);
  });

  it("abierta según el servidor pero con un último mensaje viejo: «abierta», sin una hora pasada", () => {
    const facts = sendFacts(
      options({ last_inbound_at: "2026-08-01T00:00:00.000Z" }),
      "whatsapp",
      NOW,
    );
    expect(facts[1]).toEqual({ label: "La ventana de 24 h", value: "abierta" });
  });

  it("fuera de 24 h con plantilla: sale la plantilla y el PDF al responder; sin plantilla, ningún hecho (queda el aviso)", () => {
    const outside = {
      window_open: false,
      reason: "outside_service_window",
      last_inbound_at: "2026-09-15T15:00:00.000Z",
    } as const;
    expect(
      sendFacts(
        options({ ...outside, fallback: "hsm", hsm_name: "documento_listo" }),
        "whatsapp",
        NOW,
      ),
    ).toEqual([
      {
        label: "Por WhatsApp",
        value: "le llega la plantilla «documento_listo»",
      },
      { label: "Y el PDF", value: "el PDF sale solo cuando responda" },
    ]);
    expect(sendFacts(options(outside), "whatsapp", NOW)).toEqual([]);
  });

  it("correo: el adjunto, solo si la ficha tiene correo", () => {
    expect(sendFacts(options(), "email", NOW)).toEqual([
      { label: "Por correo", value: "le llega el PDF adjunto" },
    ]);
    expect(
      sendFacts(options({}, { address_masked: null }), "email", NOW),
    ).toEqual([]);
  });
});
