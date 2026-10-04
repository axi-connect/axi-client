import { isPublicPath } from "../routes";

/**
 * Las tarjetas de enlace por página (`/og/<ruta>`, plan §26) las piden los
 * robots de WhatsApp, LinkedIn y X sin sesión: si el middleware las manda al
 * login, la vista previa sale sin imagen.
 */
describe("las tarjetas de enlace son públicas", () => {
  it("abre /og/precios, /og/productos y /og/contacto", () => {
    expect(isPublicPath("/og/precios")).toBe(true);
    expect(isPublicPath("/og/productos")).toBe(true);
    expect(isPublicPath("/og/contacto")).toBe(true);
  });

  it("NO abre por coincidencia de prefijo rutas que empiezan por «og»", () => {
    expect(isPublicPath("/organizations")).toBe(false);
    expect(isPublicPath("/ogx/precios")).toBe(false);
  });
});
