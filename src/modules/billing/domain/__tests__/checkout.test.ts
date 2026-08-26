import {
  CONFIRMATION_ATTEMPTS,
  CONFIRMATION_BACKOFF_MS,
  WOMPI_CHECKOUT_URL,
  buildReturnUrl,
  buildWompiCheckoutUrl,
  confirmationDelay,
  outcomeFromStatus,
  shouldKeepPolling,
  type CheckoutSessionDTO,
} from "../checkout";

function session(over: Partial<CheckoutSessionDTO> = {}): CheckoutSessionDTO {
  return {
    reference: "LIC-AXI-000042-1",
    amount_in_cents: 122_900_000,
    currency: "COP",
    signature: "a3f5c1d9e7b2",
    public_key: "pub_test_abc123",
    // Los dos llegan SIEMPRE null del backend: el servidor omite la expiración
    // al firmar y la URL de retorno la pone el frontend.
    expiration_time: null,
    redirect_url: null,
    ...over,
  };
}

describe("buildWompiCheckoutUrl", () => {
  const url = buildWompiCheckoutUrl(session(), "https://app.axi.co/pay/return?invoice=abc");

  it("apunta al checkout web, no al widget", () => {
    expect(url.startsWith(`${WOMPI_CHECKOUT_URL}?`)).toBe(true);
  });

  it("manda los tres valores firmados EXACTAMENTE como llegaron", () => {
    // La firma cubre reference + amount + currency: cambiar un dígito la
    // invalida y Wompi rechaza el pago.
    expect(url).toContain("reference=LIC-AXI-000042-1");
    expect(url).toContain("amount-in-cents=122900000");
    expect(url).toContain("currency=COP");
  });

  it("NO percent-codifica los dos puntos del nombre `signature:integrity`", () => {
    // `URLSearchParams` lo convertiría en `signature%3Aintegrity`. Los dos
    // puntos son legales en un nombre de parámetro y preferimos no depender de
    // que la pasarela decodifique el nombre igual que el valor.
    expect(url).toContain("signature:integrity=a3f5c1d9e7b2");
    expect(url).not.toContain("signature%3Aintegrity");
  });

  it("NO envía expiration-time: el servidor lo omite al firmar", () => {
    expect(url).not.toContain("expiration");
  });

  it("NO envía tax-in-cents: la licencia va excluida de IVA", () => {
    // Declarar un IVA que no existe es un problema tributario, no un detalle
    // de formulario.
    expect(url).not.toContain("tax-in-cents");
  });

  it("codifica el valor de la URL de retorno, que lleva query propia", () => {
    expect(url).toContain(
      `redirect-url=${encodeURIComponent("https://app.axi.co/pay/return?invoice=abc")}`,
    );
  });

  it("una expiración presente en la sesión sigue sin viajar", () => {
    // Defensa por si el backend empieza a devolverla: mandarla sin que esté en
    // la firma la rompería, y el rechazo de Wompi es genérico.
    const url2 = buildWompiCheckoutUrl(
      session({ expiration_time: "2026-09-30T00:00:00.000Z" }),
      "https://app.axi.co/pay/return",
    );
    expect(url2).not.toContain("expiration");
  });
});

describe("buildReturnUrl", () => {
  it("cuelga de /pay porque la pantalla es pública", () => {
    // Al mismo sitio vuelve quien pagó desde el panel y quien pagó por el
    // enlace sin sesión: `/billing/return` mandaría al login al segundo.
    expect(buildReturnUrl("https://app.axi.co", "inv-1")).toBe(
      "https://app.axi.co/pay/return?invoice=inv-1",
    );
  });

  it("lleva el token solo cuando el pago salió del enlace público", () => {
    expect(buildReturnUrl("https://app.axi.co", "inv-1", "tok_abc")).toBe(
      "https://app.axi.co/pay/return?invoice=inv-1&token=tok_abc",
    );
  });

  it("codifica el token, que es opaco y puede traer cualquier byte", () => {
    expect(buildReturnUrl("https://app.axi.co", "inv-1", "a+b/c=")).toContain(
      `token=${encodeURIComponent("a+b/c=")}`,
    );
  });
});

describe("el backoff de la confirmación", () => {
  it("se rinde: no es un poll infinito", () => {
    expect(confirmationDelay(CONFIRMATION_ATTEMPTS)).toBeNull();
    expect(confirmationDelay(99)).toBeNull();
  });

  it("crece en cada intento", () => {
    for (let i = 1; i < CONFIRMATION_BACKOFF_MS.length; i += 1) {
      expect(CONFIRMATION_BACKOFF_MS[i]).toBeGreaterThan(CONFIRMATION_BACKOFF_MS[i - 1]);
    }
  });

  it("respeta el throttle del endpoint público: nunca 10 peticiones en un minuto", () => {
    // El backend limita a 10 req/min por IP, y es estricto a propósito. Se
    // comprueba la ventana peor caso: cuántos intentos caben en 60 s.
    let elapsed = 0;
    let inFirstMinute = 0;
    for (const delay of CONFIRMATION_BACKOFF_MS) {
      elapsed += delay;
      if (elapsed <= 60_000) inFirstMinute += 1;
    }
    // Deja margen incluso si el usuario recarga la pantalla una vez.
    expect(inFirstMinute).toBeLessThanOrEqual(5);
  });
});

describe("outcomeFromStatus", () => {
  it("pagada es pagada", () => {
    expect(outcomeFromStatus("paid", 0)).toBe("paid");
  });

  it("saldo cero es pagada aunque el estado diga otra cosa: la retención salda", () => {
    expect(outcomeFromStatus("partially_paid", 0)).toBe("paid");
  });

  it("pago parcial con saldo se distingue de pendiente", () => {
    expect(outcomeFromStatus("partially_paid", 11_000_000)).toBe("partial");
  });

  it("`open` es PENDIENTE, no un fallo: PSE y efectivo nacen así", () => {
    // Es el escenario donde una integración ingenua da por pagada una factura
    // que nadie pagó — o por fallida una que se pagará en 24 h.
    expect(outcomeFromStatus("open", 122_900_000)).toBe("pending");
  });

  it("anulada o incobrable ya no admiten pago", () => {
    expect(outcomeFromStatus("void", 122_900_000)).toBe("unpayable");
    expect(outcomeFromStatus("uncollectible", 122_900_000)).toBe("unpayable");
  });
});

describe("shouldKeepPolling", () => {
  it("solo se sigue preguntando mientras el desenlace no está decidido", () => {
    expect(shouldKeepPolling("pending")).toBe(true);
    expect(shouldKeepPolling("paid")).toBe(false);
    expect(shouldKeepPolling("partial")).toBe(false);
    expect(shouldKeepPolling("unpayable")).toBe(false);
  });
});
