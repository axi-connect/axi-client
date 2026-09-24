import type {
  DeliveryErrorCode,
  DeliverySkipReason,
  DeliveryStatus,
  DocumentDeliveryDTO,
  DocumentSendOptionsDTO,
} from "@/modules/documents/domain/delivery";
import {
  canSend,
  CHANNEL_LABELS,
  defaultChannel,
  DELIVERY_ERROR_LABELS,
  DELIVERY_SKIP_LABELS,
  DELIVERY_STATUS_LABELS,
  deliveryLine,
  deliveryLines,
  deliveryTone,
  emailAvailability,
  whatsappAvailability,
} from "@/modules/documents/domain/delivery";

function delivery(
  overrides: Partial<DocumentDeliveryDTO> = {},
): DocumentDeliveryDTO {
  return {
    id: "dl1",
    channel: "whatsapp",
    status: "sent",
    skip_reason: null,
    error_code: null,
    content_kind: "document",
    channel_kind: "whatsapp_cloud",
    recipient_masked: "+57 ··· 0199",
    attempt: 1,
    requested_by: "user",
    requested_by_user_id: "u1",
    queued_at: "2026-09-17T15:20:00.000Z",
    resolved_at: "2026-09-17T15:24:00.000Z",
    created_at: "2026-09-17T15:20:00.000Z",
    ...overrides,
  };
}

const NOW = new Date("2026-09-17T18:00:00.000Z");

function options(
  overrides: {
    whatsapp?: Partial<DocumentSendOptionsDTO["whatsapp"]>;
    email?: Partial<DocumentSendOptionsDTO["email"]>;
    contact?: DocumentSendOptionsDTO["contact"];
  } = {},
): DocumentSendOptionsDTO {
  return {
    contact:
      overrides.contact === undefined
        ? { id: "c1", display_name: "Laura Gómez" }
        : overrides.contact,
    whatsapp: {
      reachable: true,
      reason: null,
      window_open: true,
      last_inbound_at: "2026-09-17T15:00:00.000Z",
      window_hours: 24,
      fallback: "none",
      hsm_name: null,
      recipient_masked: "+57 ··· 0199",
      ...overrides.whatsapp,
    },
    email: { address_masked: "la···@example.com", ...overrides.email },
  };
}

describe("Etiquetas de la entrega (mapas exhaustivos sobre el wire)", () => {
  it("cada estado, razón y error tiene frase en español; nunca se pinta el código", () => {
    const statuses: DeliveryStatus[] = [
      "queued",
      "sent",
      "delivered",
      "failed",
      "skipped",
    ];
    for (const status of statuses)
      expect(DELIVERY_STATUS_LABELS[status]).toMatch(/\S/);
    const reasons = Object.keys(DELIVERY_SKIP_LABELS) as DeliverySkipReason[];
    expect(reasons).toEqual(
      expect.arrayContaining([
        "outside_service_window_no_hsm",
        "contact_without_email",
        "no_channel",
        "file_too_large",
        "email_provider_disabled",
      ]),
    );
    for (const reason of reasons)
      expect(DELIVERY_SKIP_LABELS[reason]).not.toMatch(/_/);
    const errors = Object.keys(DELIVERY_ERROR_LABELS) as DeliveryErrorCode[];
    for (const code of errors)
      expect(DELIVERY_ERROR_LABELS[code]).not.toMatch(/_/);
    expect(CHANNEL_LABELS).toEqual({ whatsapp: "WhatsApp", email: "correo" });
  });

  it("delivered es inalcanzable y se lee como enviado: no se promete una entrega que Meta no reporta", () => {
    expect(DELIVERY_STATUS_LABELS.delivered).toBe(DELIVERY_STATUS_LABELS.sent);
    expect(deliveryTone("delivered")).toBe(deliveryTone("sent"));
  });
});

describe("deliveryLine: la tercera línea de la fila, por estado × canal", () => {
  it("queued late (busy) y no tiene hora ni salida", () => {
    expect(
      deliveryLine(delivery({ status: "queued", resolved_at: null })),
    ).toEqual({
      channel: "whatsapp",
      tone: "busy",
      text: "Enviando por WhatsApp…",
      detail: null,
      at: null,
      retry: null,
    });
    expect(
      deliveryLine(delivery({ status: "queued", channel: "email" })).text,
    ).toBe("Enviando por correo…");
  });

  it("sent por WhatsApp dice el hecho y cuándo; por correo, también a quién", () => {
    const wa = deliveryLine(delivery());
    expect(wa).toMatchObject({
      tone: "ok",
      text: "Enviado por WhatsApp",
      detail: null,
      at: "2026-09-17T15:24:00.000Z",
      retry: null,
    });
    const mail = deliveryLine(
      delivery({ channel: "email", recipient_masked: "la***@example.com" }),
    );
    expect(mail.text).toBe("Enviado por correo");
    expect(mail.detail).toBe("a la***@example.com");
  });

  it("el aviso HSM es un envío distinto del PDF: «salió el aviso», y promete el PDF al responder", () => {
    const line = deliveryLine(delivery({ content_kind: "hsm_notice" }));
    expect(line.text).toBe("Salió el aviso por WhatsApp");
    expect(line.detail).toBe("el PDF llega cuando responda");
    expect(line.tone).toBe("ok");
  });

  it("failed es rojo, dice por qué si el código se conoce, y ofrece repetir por el mismo canal", () => {
    const known = deliveryLine(
      delivery({ status: "failed", error_code: "provider_failed" }),
    );
    expect(known).toMatchObject({
      tone: "bad",
      text: "No se pudo enviar por WhatsApp",
      detail: "WhatsApp lo rechazó",
      retry: "same",
    });
    const unknown = deliveryLine(
      delivery({ status: "failed", error_code: "algo_nuevo" }),
    );
    expect(unknown.detail).toBeNull();
    expect(unknown.retry).toBe("same");
  });

  it("skipped es ámbar con la razón escrita; la ventana cerrada sin plantilla ofrece el correo, la ficha sin correo no ofrece nada", () => {
    const window = deliveryLine(
      delivery({
        status: "skipped",
        skip_reason: "outside_service_window_no_hsm",
      }),
    );
    expect(window).toMatchObject({
      tone: "warn",
      text: "No salió por WhatsApp",
      detail: "fuera de la ventana de 24 h y sin plantilla aprobada",
      retry: "email",
    });
    const noEmail = deliveryLine(
      delivery({
        status: "skipped",
        channel: "email",
        skip_reason: "contact_without_email",
      }),
    );
    expect(noEmail.text).toBe("No salió por correo");
    expect(noEmail.detail).toBe("no tiene correo en su ficha");
    expect(noEmail.retry).toBeNull();
    // Un canal caído sí se puede repetir
    expect(
      deliveryLine(
        delivery({ status: "skipped", skip_reason: "channel_not_connected" }),
      ).retry,
    ).toBe("same");
    // Una razón desconocida no pinta el código
    expect(
      deliveryLine(delivery({ status: "skipped", skip_reason: "x_y_z" }))
        .detail,
    ).toBe("no se pudo mandar por aquí");
  });

  it("deliveryLines: WhatsApp y luego correo, solo los que existen", () => {
    expect(
      deliveryLines({ last_delivery: { whatsapp: null, email: null } }),
    ).toEqual([]);
    const lines = deliveryLines({
      last_delivery: {
        whatsapp: delivery({ status: "queued" }),
        email: delivery({ channel: "email" }),
      },
    });
    expect(lines.map((line) => `${line.channel}:${line.tone}`)).toEqual([
      "whatsapp:busy",
      "email:ok",
    ]);
    expect(
      deliveryLines({
        last_delivery: {
          whatsapp: null,
          email: delivery({ channel: "email" }),
        },
      }),
    ).toHaveLength(1);
  });

  it("canSend: solo el PDF listo", () => {
    expect(canSend({ status: "rendered" })).toBe(true);
    for (const status of [
      "queued",
      "rendering",
      "failed",
      "superseded",
    ] as const)
      expect(canSend({ status })).toBe(false);
  });
});

describe("whatsappAvailability: las CUATRO ramas se LEEN de send-options, no se recalculan", () => {
  it("ventana abierta → open: el PDF le llega al chat, con cuándo escribió", () => {
    const wa = whatsappAvailability(options(), true, NOW);
    expect(wa.mode).toBe("open");
    expect(wa.enabled).toBe(true);
    expect(wa.summary).toMatch(/\+57 ··· 0199 · escribió hace 3 h/);
    expect(wa.notice?.tone).toBe("ok");
    expect(wa.notice?.text).toMatch(/el PDF le llega al chat/);
  });

  it("fuera de ventana con plantilla → hsm: sale el aviso «documento_listo» y el PDF al responder", () => {
    const wa = whatsappAvailability(
      options({
        whatsapp: {
          window_open: false,
          reason: "outside_service_window",
          fallback: "hsm",
          hsm_name: "documento_listo",
          last_inbound_at: "2026-09-15T15:00:00.000Z",
        },
      }),
      true,
      NOW,
    );
    expect(wa.mode).toBe("hsm");
    expect(wa.enabled).toBe(true);
    expect(wa.summary).toMatch(/su último mensaje fue anteayer/);
    expect(wa.notice?.tone).toBe("info");
    expect(wa.notice?.text).toMatch(/«documento_listo»/);
    expect(wa.notice?.text).toMatch(/el PDF sale solo cuando responda/);
  });

  it("fuera de ventana sin plantilla → no_hsm: deshabilitada con la razón; el enlace solo para quien puede configurar", () => {
    const base = options({
      whatsapp: {
        window_open: false,
        reason: "outside_service_window",
        fallback: "none",
      },
    });
    const admin = whatsappAvailability(base, true, NOW);
    expect(admin.mode).toBe("no_hsm");
    expect(admin.enabled).toBe(false);
    expect(admin.summary).toMatch(/no hay una plantilla aprobada/);
    expect(admin.notice).toMatchObject({ tone: "warn", configureLink: true });
    expect(whatsappAvailability(base, false, NOW).notice?.configureLink).toBe(
      false,
    );
  });

  it("sin canal → unreachable con la razón del servidor; sin contacto, idem", () => {
    const noChannel = whatsappAvailability(
      options({
        whatsapp: {
          reachable: false,
          window_open: false,
          reason: "no_channel",
          recipient_masked: null,
        },
      }),
      true,
      NOW,
    );
    expect(noChannel).toMatchObject({
      mode: "unreachable",
      enabled: false,
      summary: "No tiene un canal de WhatsApp por el que escribirle.",
      notice: null,
    });
    const nobody = whatsappAvailability(
      options({
        contact: null,
        whatsapp: {
          reachable: false,
          window_open: false,
          reason: "no_counterparty",
        },
      }),
      true,
      NOW,
    );
    expect(nobody.mode).toBe("unreachable");
    expect(nobody.summary).toMatch(/no está a nombre de nadie/);
  });

  it("el cliente NO decide la ventana: con window_open=true el modo es open aunque last_inbound_at sea viejo", () => {
    // Si el cliente recalculara las 24 h con la fecha, esto daría hsm/no_hsm.
    const wa = whatsappAvailability(
      options({
        whatsapp: {
          window_open: true,
          last_inbound_at: "2026-08-01T00:00:00.000Z",
        },
      }),
      true,
      NOW,
    );
    expect(wa.mode).toBe("open");
    // Y al revés: fecha reciente pero el servidor dice ventana cerrada → hsm/no_hsm.
    const closed = whatsappAvailability(
      options({
        whatsapp: {
          window_open: false,
          reason: "outside_service_window",
          fallback: "none",
          last_inbound_at: NOW.toISOString(),
        },
      }),
      true,
      NOW,
    );
    expect(closed.mode).toBe("no_hsm");
  });
});

describe("emailAvailability y defaultChannel", () => {
  it("la ficha es la dirección de registro: con correo, enmascarado; sin él, deshabilitada y dice dónde añadirlo", () => {
    expect(emailAvailability(options())).toEqual({
      enabled: true,
      summary: "la···@example.com",
    });
    const none = emailAvailability(
      options({ email: { address_masked: null } }),
    );
    expect(none.enabled).toBe(false);
    expect(none.summary).toMatch(/Añádelo en el contacto/);
  });

  it("al abrir se marca el canal pedido si se puede; si no, WhatsApp; si no, correo; si nada, ninguno", () => {
    expect(defaultChannel(options(), undefined, true)).toBe("whatsapp");
    expect(defaultChannel(options(), "email", true)).toBe("email");
    const closed = options({
      whatsapp: {
        window_open: false,
        reason: "outside_service_window",
        fallback: "none",
      },
    });
    expect(defaultChannel(closed, "whatsapp", true)).toBe("email");
    expect(
      defaultChannel(
        options({
          whatsapp: {
            reachable: false,
            window_open: false,
            reason: "no_channel",
          },
          email: { address_masked: null },
        }),
        undefined,
        true,
      ),
    ).toBeNull();
  });
});
