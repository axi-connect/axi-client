import { HttpError } from "@/core/api/problem";
import type { UseFormReturn } from "react-hook-form";
import { applyServerValidation, errorMessage } from "../error-messages";

const httpError = (code: string, detail?: string) =>
  new HttpError({
    status: 409,
    code,
    message: detail ?? code,
    problem: { type: "x", title: "Conflict", status: 409, code, detail },
  });

describe("errorMessage — códigos del panel de plataforma (tabla §7)", () => {
  const CASES: [string, RegExp][] = [
    ["tenant_db/not_found", /no tiene base de datos dedicada/i],
    ["tenant_db/not_active", /requiere una base de datos dedicada activa/i],
    ["tenant_db/in_use", /cambia el plan del tenant primero/i],
    ["tenant_db/provision_in_progress", /provisión en curso/i],
    ["tenant_db/connection_failed", /verifica host, puerto/i],
    ["tenant_db/unsupported_version", /postgresql no soportada/i],
    ["tenant_db/version_mismatch", /reprovisiona la base/i],
    ["tenant_db/missing_extension", /pg_trgm\/unaccent/i],
    ["tenant_db/insufficient_privileges", /privilegio create/i],
    ["usage/plan_code_taken", /ya existe un plan con ese código/i],
    ["usage/plan_not_found", /el plan no existe/i],
    ["usage/plan_inactive", /está desactivado/i],
    ["usage/plan_tier_immutable", /no puede cambiarse/i],
    ["usage/limit_invalid", /revisa las filas marcadas/i],
  ];

  it.each(CASES)("%s → mensaje en español del diccionario", (code, expected) => {
    expect(errorMessage(httpError(code, "raw english detail"))).toMatch(expected);
  });

  it("un código desconocido cae al detail del problema", () => {
    expect(errorMessage(httpError("otros/desconocido", "detalle del server"))).toContain(
      "detalle del server",
    );
  });

  it.each([
    ["forms/not_found", /el formulario ya no existe/i],
    ["forms/invalid_definition", /revisa códigos, tipos y opciones/i],
    ["forms/invalid_data", /no cumplen el formulario/i],
  ])("%s → mensaje en español del diccionario", (code, expected) => {
    expect(errorMessage(httpError(code, "raw english detail"))).toMatch(expected);
  });
});

describe("applyServerValidation — paths con índices de array", () => {
  const validationError = (path: (string | number)[]) =>
    new HttpError({
      status: 400,
      code: "validation/failed",
      message: "validation failed",
      problem: {
        type: "x",
        title: "Bad Request",
        status: 400,
        code: "validation/failed",
        errors: [{ path, message: "code duplicado" }],
      },
    });

  const fakeForm = () => {
    const setError = jest.fn();
    return { form: { setError } as unknown as UseFormReturn<Record<string, unknown>>, setError };
  };

  it("conserva el índice numérico: ['fields',0,'code'] → 'fields.0.code'", () => {
    const { form, setError } = fakeForm();

    expect(applyServerValidation(validationError(["fields", 0, "code"]), form)).toBe(true);
    expect(setError).toHaveBeenCalledWith("fields.0.code", {
      type: "server",
      message: "code duplicado",
    });
  });

  it("los paths de un nivel no cambian (no-op para los consumidores actuales)", () => {
    const { form, setError } = fakeForm();

    applyServerValidation(validationError(["nit"]), form);
    expect(setError).toHaveBeenCalledWith("nit", expect.objectContaining({ type: "server" }));
  });

  it("ignora los errores que no son validation/failed", () => {
    const { form, setError } = fakeForm();

    expect(applyServerValidation(httpError("forms/not_found"), form)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});

/**
 * Criterio de cierre de F3: cada `code` del onboarding de Meta produce un mensaje
 * EN ESPAÑOL y SIN JERGA. Se comprueba aquí, con el diccionario, y no con
 * capturas de pantalla: una captura envejece y este test falla el día que alguien
 * añada un código sin su traducción.
 */
describe("errorMessage — onboarding de canales Meta (F3)", () => {
  const META_CODES = [
    "channels/meta_signup_disabled",
    "channels/meta_code_expired",
    "channels/meta_missing_scopes",
    "channels/meta_account_mismatch",
    "channels/onboarding_in_progress",
    "channels/meta_registration_required",
    "channels/meta_pin_invalid",
    "channels/meta_payment_method_required",
    "channels/provider_account_taken",
  ];

  it.each(META_CODES)("%s tiene traducción propia, no el detalle del backend", (code) => {
    const message = errorMessage(httpError(code, "DETALLE CRUDO DEL BACKEND"));

    expect(message).not.toBe("DETALLE CRUDO DEL BACKEND");
    expect(message.length).toBeGreaterThan(30);
  });

  it.each(META_CODES)("%s no filtra jerga técnica al usuario", (code) => {
    const message = errorMessage(httpError(code));

    // El usuario no lee identificadores de Meta: eso vive en "Detalles técnicos"
    // del paso 4, que existe para que soporte pida desplegarlo
    expect(message).not.toMatch(/phone_number_id|waba|access_token|graph api|oauth/i);
  });

  it("el mensaje dice QUÉ HACER, no solo qué falló", () => {
    // Un error que no ofrece salida deja al usuario mirando una pared
    expect(errorMessage(httpError("channels/meta_code_expired"))).toMatch(/vuelve a intentarlo/i);
    expect(errorMessage(httpError("channels/meta_pin_invalid"))).toMatch(/registraste en Meta/i);
    expect(errorMessage(httpError("channels/meta_payment_method_required"))).toMatch(
      /Administrador de WhatsApp/i,
    );
  });
});
