import {
  deliveryLabel,
  extractTemplatePayload,
  failureCopy,
  mergeDeliveryStatus,
  parseMessageError,
  resentByOf,
  resentFrom,
} from "@/modules/inbox/domain/template-message";

// El payload tal cual quedó en producción el 2026-09-29 (incidente de la plantilla rechazada).
const INCIDENT_PAYLOAD = {
  template: {
    name: "sesion_en_vivo_v2",
    language: "es_CO",
    components: [
      {
        type: "body",
        parameters: [
          { text: "Cristian", type: "text" },
          { text: "Kodecol", type: "text" },
          { text: "la lista de planes con precios", type: "text" },
          { text: "30 de septiembre", type: "text" },
        ],
      },
    ],
  },
};

describe("extractTemplatePayload", () => {
  it("lee nombre, idioma y los valores del cuerpo del incidente", () => {
    expect(extractTemplatePayload(INCIDENT_PAYLOAD)).toEqual({
      name: "sesion_en_vivo_v2",
      language: "es_CO",
      bodyParams: ["Cristian", "Kodecol", "la lista de planes con precios", "30 de septiembre"],
      headerParams: [],
      headerMedia: false,
    });
  });

  it("distingue la cabecera de texto de la de imagen", () => {
    const text = extractTemplatePayload({
      template: { name: "t", components: [{ type: "HEADER", parameters: [{ type: "text", text: "Octubre" }] }] },
    });
    expect(text).toMatchObject({ headerParams: ["Octubre"], headerMedia: false });
    const image = extractTemplatePayload({
      template: { name: "t", components: [{ type: "header", parameters: [{ type: "image", image: { link: "x" } }] }] },
    });
    expect(image).toMatchObject({ headerParams: [], headerMedia: true });
  });

  it("sin nombre o sin template no hay plantilla (la burbuja no inventa)", () => {
    expect(extractTemplatePayload({ template: { language: "es" } })).toBeNull();
    expect(extractTemplatePayload({ interactive: {} })).toBeNull();
    expect(extractTemplatePayload(null)).toBeNull();
  });

  it("sin components salen los datos básicos con listas vacías", () => {
    expect(extractTemplatePayload({ template: { name: "hola", language: "es" } })).toMatchObject({
      name: "hola",
      bodyParams: [],
    });
  });
});

describe("parseMessageError + failureCopy", () => {
  it("el webhook de Meta del incidente dice que no se cobró", () => {
    const failure = parseMessageError({
      code: 131042,
      title: "Business eligibility payment issue",
      details: "Message failed to send because there were one or more errors related to your payment method.",
    });
    expect(failure).toEqual({
      code: "131042",
      title: "Business eligibility payment issue",
      detail: "Message failed to send because there were one or more errors related to your payment method.",
    });
    expect(failureCopy(failure)).toMatch(/método de pago/);
  });

  it("el fallo síncrono de la plataforma se traduce por su último tramo", () => {
    const failure = parseMessageError({ code: "channels/invalid_credentials", detail: "token expired" });
    expect(failureCopy(failure)).toMatch(/vuelve a conectar el canal/);
  });

  it("sin error guardado todavía, usa el error_code del evento en vivo", () => {
    expect(failureCopy(null, "131026")).toMatch(/no puede recibir/);
  });

  it("un código que no conocemos cae al genérico, nunca al texto en inglés", () => {
    const copy = failureCopy(parseMessageError({ code: 999999, title: "Something odd" }));
    expect(copy).not.toMatch(/Something odd/);
    expect(copy).toMatch(/Reenvíalo/);
    expect(failureCopy(null)).toBe(copy);
  });

  it("un error sin nada legible no es un error", () => {
    expect(parseMessageError({})).toBeNull();
    expect(parseMessageError("boom")).toBeNull();
  });
});

describe("mergeDeliveryStatus — los dos signos", () => {
  it("avanza: sent → delivered → read", () => {
    expect(mergeDeliveryStatus("sent", "delivered")).toBe("delivered");
    expect(mergeDeliveryStatus("delivered", "read")).toBe("read");
    expect(mergeDeliveryStatus("queued", "sent")).toBe("sent");
  });

  it("no retrocede: un delivered tardío o un confirm de envío no bajan un read", () => {
    expect(mergeDeliveryStatus("read", "delivered")).toBe("read");
    expect(mergeDeliveryStatus("read", "sent")).toBe("read");
    expect(mergeDeliveryStatus("delivered", "sent")).toBe("delivered");
  });

  it("failed manda sobre lo aceptado (Meta rechaza después de aceptar) y no se deshace", () => {
    expect(mergeDeliveryStatus("sent", "failed")).toBe("failed");
    expect(mergeDeliveryStatus("read", "failed")).toBe("failed");
    expect(mergeDeliveryStatus("failed", "delivered")).toBe("failed");
  });
});

describe("deliveryLabel y resentFrom", () => {
  it("dice el estado en palabras", () => {
    expect(deliveryLabel("queued", false)).toBe("Enviando");
    expect(deliveryLabel("sent", true)).toBe("Enviando");
    expect(deliveryLabel("sent", false)).toBe("Enviada");
    expect(deliveryLabel("delivered", false)).toBe("Entregada");
    expect(deliveryLabel("read", false)).toBe("Leída");
    expect(deliveryLabel("failed", false)).toBeNull();
  });

  it("lee el enlace al mensaje original de un reenvío", () => {
    expect(resentFrom({ resent_from: "m1", template: {} })).toBe("m1");
    expect(resentFrom({})).toBeNull();
    expect(resentByOf({ resent_by_user_id: "u1" })).toBe("u1");
    expect(resentByOf(null)).toBeNull();
  });
});
