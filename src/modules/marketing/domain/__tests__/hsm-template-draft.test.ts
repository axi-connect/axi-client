import {
  firstMissingExample,
  hsmDraftErrors,
  stepsWithErrors,
  type HsmTemplateDraft,
} from "@/modules/marketing/domain/hsm-template-draft";

const OK: HsmTemplateDraft = {
  base: "temporada_coleccion",
  name: "temporada_coleccion_v1",
  body: "Hola {{1}}, ya llegó la colección. Tienes {{2}} de descuento hasta el domingo.",
  examples: ["Ana", "20 %"],
  header: null,
  footer: null,
  buttons: [],
};

describe("hsmDraftErrors · las reglas de Meta antes de gastar el envío", () => {
  it("un borrador completo no tiene errores", () => {
    expect(hsmDraftErrors(OK)).toEqual({});
  });

  it("sin nombre pide uno; con uno muy corto, lo dice", () => {
    expect(hsmDraftErrors({ ...OK, base: "", name: "_v1" }).name).toBe("Escribe un nombre para reconocerla");
    expect(hsmDraftErrors({ ...OK, base: "a", name: "a_v1" })).toEqual({});
    expect(hsmDraftErrors({ ...OK, base: "", name: "" }).name).toBeDefined();
  });

  it("nombra el ejemplo que falta, no solo que falta alguno", () => {
    expect(hsmDraftErrors({ ...OK, examples: ["Ana", " "] }).examples).toBe(
      "Meta exige un ejemplo por cada variable: falta el de {{2}}",
    );
  });

  it("cabecera o pie añadidos y vacíos son un error, no una omisión", () => {
    const errors = hsmDraftErrors({ ...OK, header: "  ", footer: "" });
    expect(errors.header).toBe("Escribe la cabecera o quítala");
    expect(errors.footer).toBe("Escribe el pie o quítalo");
  });

  it("variables fuera de las reglas de Meta", () => {
    expect(hsmDraftErrors({ ...OK, body: "{{1}} empieza con una variable y no vale", examples: ["x"] }).body).toBeDefined();
  });
});

describe("pasos con error", () => {
  it("cada campo abre su paso: el nombre la ficha, lo demás el mensaje", () => {
    const steps = stepsWithErrors({ name: "x", footer: "y" });
    expect([...steps].sort()).toEqual(["ficha", "message"]);
    expect(stepsWithErrors({}).size).toBe(0);
  });

  it("firstMissingExample es 1-based y respeta cuántas variables hay", () => {
    expect(firstMissingExample(["Ana"], 2)).toBe(2);
    expect(firstMissingExample(["Ana", "x", ""], 2)).toBeNull();
    expect(firstMissingExample([], 0)).toBeNull();
  });
});
