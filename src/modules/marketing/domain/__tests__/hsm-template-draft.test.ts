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

  it("una cabecera de medio sin archivo no se envía; subiendo, se espera", () => {
    expect(hsmDraftErrors({ ...OK, headerMedia: { ready: false, uploading: false } }).header).toBe(
      "Sube el archivo de la cabecera o quítala",
    );
    expect(hsmDraftErrors({ ...OK, headerMedia: { ready: false, uploading: true } }).header).toBe(
      "Espera a que termine de subir el archivo de la cabecera",
    );
    expect(hsmDraftErrors({ ...OK, headerMedia: { ready: true, uploading: false } })).toEqual({});
  });

  it("variables fuera de las reglas de Meta", () => {
    expect(hsmDraftErrors({ ...OK, body: "{{1}} empieza con una variable y no vale", examples: ["x"] }).body).toBeDefined();
  });

  it("un enlace que sigue en el example.com de la biblioteca de Meta no sale (F5)", () => {
    const placeholder = { type: "url" as const, text: "Ver cuenta", url: "https://www.example.com" };
    expect(hsmDraftErrors({ ...OK, buttons: [placeholder] }).buttons).toBe("Pon la dirección de tu negocio en «Ver cuenta»");
    expect(hsmDraftErrors({ ...OK, buttons: [{ ...placeholder, url: "https://savage.co/cuenta" }] })).toEqual({});
    // A medias sigue diciendo lo de siempre: primero completarlo.
    expect(hsmDraftErrors({ ...OK, buttons: [{ ...placeholder, text: "" }] }).buttons).toBe("Completa cada botón o quítalo");
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
