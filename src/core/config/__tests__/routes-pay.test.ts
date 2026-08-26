import { PUBLIC_PATHS, isPublicPath } from "../routes";
import { DISALLOWED_PREFIXES } from "@/core/seo/routes";

/**
 * La superficie de pago sin sesión tiene DOS guardas que hay que pasar, y el
 * segundo es el que se olvida: además del middleware del edge, el `AuthProvider`
 * hidrata en todo el árbol y su `redirectToLogin()` solo se salva por
 * `isPublicPath`. Sin el registro, el cliente manda al login aunque el
 * middleware no lo haga.
 */
describe("la superficie /pay es pública", () => {
  it("está registrada en PUBLIC_PATHS", () => {
    expect(PUBLIC_PATHS).toContain("/pay");
  });

  it("cubre el retorno del checkout y el enlace de una factura", () => {
    expect(isPublicPath("/pay/return")).toBe(true);
    expect(isPublicPath("/pay/018f0000-0000-7000-8000-000000000042/tok_abc123")).toBe(true);
  });

  it("NO abre el panel de facturación, que sigue exigiendo sesión", () => {
    expect(isPublicPath("/billing")).toBe(false);
    expect(isPublicPath("/billing/invoices")).toBe(false);
  });

  it("NO abre `/payments` ni `/payment-methods` por coincidencia de prefijo", () => {
    // `isPublicPath` compara por segmento (`p + "/"`), no por `startsWith("/pay")`.
    // Un match laxo habría dejado públicas las rutas de cobro del tenant a sus
    // propios clientes, que son otro módulo entero.
    expect(isPublicPath("/payments")).toBe(false);
    expect(isPublicPath("/payment-methods")).toBe(false);
    expect(isPublicPath("/paywall")).toBe(false);
  });
});

describe("la superficie /pay no se indexa", () => {
  it("está en los prefijos bloqueados del robots.txt", () => {
    // La URL lleva un token de un solo recurso: no tiene nada que hacer en un
    // buscador ni en el sitemap.
    expect(DISALLOWED_PREFIXES).toContain("/pay/");
  });
});
