import { HttpError } from "@/core/api/problem";
import { errorMessage } from "../error-messages";

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
});
