import { API_ERROR_CODES, isSuspensionCode } from "../problem";

/**
 * `auth/payment_overdue` comparte TODA la maquinaria de F15 —tokens revocados,
 * pantalla bloqueante, sin refresh— y solo cambia el copy. Entra por
 * `isSuspensionCode`, que es el único punto de extensión: el interceptor del
 * `HttpClient`, el route handler de sesión y las dos ramas de refresh del proxy
 * discriminan por ahí.
 */
describe("isSuspensionCode", () => {
  it("reconoce la mora como bloqueo total de la empresa", () => {
    expect(isSuspensionCode(API_ERROR_CODES.paymentOverdue)).toBe(true);
  });

  it("sigue reconociendo la suspensión genérica y el trial vencido", () => {
    expect(isSuspensionCode(API_ERROR_CODES.companySuspended)).toBe(true);
    expect(isSuspensionCode(API_ERROR_CODES.trialExpired)).toBe(true);
  });

  it("un 403 de RBAC NO dispara la pantalla bloqueante", () => {
    // No-regresión de F15: el interceptor discrimina por `code`, nunca por el
    // status 403 a secas. Un permiso denegado muestra su error puntual.
    expect(isSuspensionCode(API_ERROR_CODES.permissionDenied)).toBe(false);
  });

  it("una sesión expirada tampoco: esa va al login, no a la pantalla", () => {
    expect(isSuspensionCode(API_ERROR_CODES.unauthorized)).toBe(false);
    expect(isSuspensionCode(API_ERROR_CODES.invalidRefresh)).toBe(false);
    expect(isSuspensionCode(undefined)).toBe(false);
  });

  it("el code de la mora es DISTINTO del genérico, y eso es el punto", () => {
    // Existe separado para el frontend: permite llevar a quien solo necesita
    // pagar a una pantalla de pago en vez de a «contacta a soporte».
    expect(API_ERROR_CODES.paymentOverdue).toBe("auth/payment_overdue");
    expect(API_ERROR_CODES.paymentOverdue).not.toBe(API_ERROR_CODES.companySuspended);
  });
});
