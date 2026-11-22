import { isWebFillableField, splitWebFillable } from "../form-fill";

const f = (code: string, label: string, type = "text") => ({ code, label, type });

describe("form-fill", () => {
  it("los datos del negocio se pueden leer en la web; los de la persona, nunca", () => {
    const fields = [
      f("nombre", "Nombre"),
      f("celular", "Celular", "phone"),
      f("tipo_negocio", "Tipo de negocio", "select"),
      f("sedes", "Número de sedes", "number"),
      f("vende_instagram", "¿Vende por Instagram?", "boolean"),
      f("cumpleanos", "Cumpleaños", "date"),
      f("cedula", "Cédula"),
      f("correo_empresa", "Correo de la empresa", "text"),
      f("horario", "Horario de atención"),
    ];
    const { web, personal } = splitWebFillable(fields);
    expect(web.map((field) => field.code)).toEqual([
      "tipo_negocio",
      "sedes",
      "vende_instagram",
      "horario",
    ]);
    expect(personal.map((field) => field.code)).toEqual([
      "nombre",
      "celular",
      "cumpleanos",
      "cedula",
      "correo_empresa",
    ]);
  });

  it("compara sin tildes ni mayúsculas, por código o por nombre", () => {
    expect(isWebFillableField(f("doc", "IDENTIFICACIÓN"))).toBe(false);
    expect(isWebFillableField(f("nombre_comercial", "Marca"))).toBe(false);
    expect(isWebFillableField(f("agenda", "Herramienta de agenda o reservas"))).toBe(true);
  });
});
