import { isPublicPath } from "../routes";
import { DISALLOWED_PREFIXES } from "@/core/seo/routes";

/**
 * Las páginas de «Entrega y bienvenida» (entrega_bienvenida_plan.md, F4) las
 * abre gente SIN sesión: el dueño que aún no ha creado su contraseña y quien la
 * olvidó. Si alguna quedara privada, el middleware la mandaría al login —el
 * mismo login que no puede usar—.
 */
describe("páginas públicas de la entrega", () => {
  it("el kit de bienvenida es público y no se rastrea", () => {
    expect(isPublicPath("/bienvenida/Zk3n0p-Qa_9sT2uV8wXyZ012345678")).toBe(true);
    expect(DISALLOWED_PREFIXES).toContain("/bienvenida/");
  });

  it("las tres páginas de contraseña caen bajo el prefijo público /auth", () => {
    expect(isPublicPath("/auth/crear-contrasena")).toBe(true);
    expect(isPublicPath("/auth/restablecer")).toBe(true);
    expect(isPublicPath("/auth/olvide-contrasena")).toBe(true);
  });

  it("las imágenes del correo se sirven sin sesión", () => {
    expect(isPublicPath("/images/email/welcome/hero.jpg")).toBe(true);
  });

  it("no abre por coincidencia de prefijo rutas vecinas", () => {
    expect(isPublicPath("/bienvenidas")).toBe(false);
  });
});
