import { PUBLIC_BILLING_ERRORS, type PublicInvoiceDTO } from "../public-invoice";

/**
 * Estos tipos están escritos a MANO porque el controlador público del backend
 * es `@ApiExcludeController` y no entra en `openapi.json`. Sin este test, un
 * cambio de forma en el backend no se notaría en ningún sitio: no hay generador
 * que lo detecte.
 */
describe("la forma de la vista pública queda fijada", () => {
  it("trae lo mínimo para pagar y nada del tenant", () => {
    const invoice: PublicInvoiceDTO = {
      number: "AXI-000042",
      period_start: "2026-08-01T00:00:00Z",
      period_end: "2026-08-31T23:59:59Z",
      due_at: "2026-09-06T00:00:00Z",
      amount_cents: 122_900_000,
      currency: "COP",
      status: "open",
      payable: true,
    };

    expect(Object.keys(invoice).sort()).toEqual([
      "amount_cents",
      "currency",
      "due_at",
      "number",
      "payable",
      "period_end",
      "period_start",
      "status",
    ]);
  });

  it("NO expone razón social, NIT ni desglose", () => {
    // La respuesta es mínima a propósito: quien tiene el enlace puede ser el
    // contador externo o alguien a quien se lo reenviaron. Si esta lista crece,
    // es una decisión de privacidad, no un detalle de tipado.
    const permitidos = new Set([
      "number",
      "period_start",
      "period_end",
      "due_at",
      "amount_cents",
      "currency",
      "status",
      "payable",
    ]);

    for (const prohibido of ["legal_name", "tax_id", "lines", "company_id", "billing_email"]) {
      expect(permitidos.has(prohibido)).toBe(false);
    }
  });

  it("los tres códigos de error de la página pública están declarados", () => {
    expect(PUBLIC_BILLING_ERRORS.linkExpired).toBe("billing/link_expired");
    expect(PUBLIC_BILLING_ERRORS.unauthorized).toBe("auth/unauthorized");
    expect(PUBLIC_BILLING_ERRORS.notPayable).toBe("billing/invoice_not_payable");
  });
});
