import type { HsmLibraryTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  filterLibrary,
  isStillLibrary,
  libraryBodyParts,
  libraryDraft,
  libraryHighlights,
  libraryTitle,
  libraryTopicLabel,
  libraryTopics,
  placeholderButtonIssue,
  type LibraryComparable,
} from "@/modules/marketing/domain/template-library";
import type { TemplateButton } from "@/modules/marketing/domain/template-pieces";

/** La muestra real que devuelve el servidor (hsm-media F5). */
const AUTO_PAY: HsmLibraryTemplateDTO = {
  name: "auto_pay_reminder_1",
  language: "es",
  topic: "PAYMENTS",
  usecase: "AUTO_PAY_REMINDER",
  industries: ["FINANCIAL_SERVICES"],
  header: "Próximo pago automático",
  header_example: null,
  body:
    "Hola, {{1}}: \n\nTu pago automático de {{2}} está programado para el {{3}} en la cuenta {{4}}.\n\nAsegúrate de tener saldo suficiente para evitar cargos por {{5}}.",
  body_examples: ["John", "$12,34", "1 de enero de 2024", "CS Mutual Checking", "retraso"],
  footer: null,
  buttons: [{ type: "url", text: "Ver cuenta", url: "https://www.example.com" }],
};

const lib = (over: Partial<HsmLibraryTemplateDTO> = {}): HsmLibraryTemplateDTO => ({ ...AUTO_PAY, ...over });

/** Lo que el formulario tendría justo después de elegirla. */
function asLoaded(template: HsmLibraryTemplateDTO): LibraryComparable {
  const draft = libraryDraft(template);
  return {
    category: draft.category,
    language: draft.language,
    header: draft.headerText,
    hasMediaHeader: false,
    body: draft.body,
    footer: draft.footer,
    buttons: draft.buttons,
  };
}

describe("cómo se llama en español", () => {
  it("los temas conocidos tienen nombre; uno nuevo cae en «Otros»", () => {
    expect(libraryTopicLabel("PAYMENTS")).toBe("Pagos");
    expect(libraryTopicLabel("ORDER_MANAGEMENT")).toBe("Pedidos y envíos");
    expect(libraryTopicLabel("ACCOUNT_UPDATES")).toBe("Cuenta");
    expect(libraryTopicLabel("EVENT_REMINDER")).toBe("Recordatorios");
    expect(libraryTopicLabel("IDENTITY_VERIFICATION")).toBe("Verificación");
    expect(libraryTopicLabel("CUSTOMER_FEEDBACK")).toBe("Opiniones");
    expect(libraryTopicLabel("SOMETHING_NEW")).toBe("Otros");
  });

  it("el título es la cabecera; sin ella, el caso de uso; sin él, el nombre legible", () => {
    expect(libraryTitle(AUTO_PAY)).toBe("Próximo pago automático");
    expect(libraryTitle(lib({ header: null }))).toBe("Recordatorio de pago automático");
    // Una cabecera con hueco no nombra nada.
    expect(libraryTitle(lib({ header: "Tu pedido {{1}}", usecase: "DELIVERY_UPDATE" }))).toBe("Pedido en camino");
    expect(libraryTitle(lib({ header: null, usecase: "UNKNOWN", name: "weird_case_12" }))).toBe("Weird case");
  });
});

describe("libraryDraft · lo que recibe el formulario", () => {
  it("Utilidad, `es`, el texto, los ejemplos y los botones, con el título por nombre", () => {
    expect(libraryDraft(AUTO_PAY)).toEqual({
      category: "utility",
      language: "es",
      headerText: "Próximo pago automático",
      headerExample: null,
      body: AUTO_PAY.body,
      examples: AUTO_PAY.body_examples,
      footer: null,
      buttons: [{ type: "url", text: "Ver cuenta", url: "https://www.example.com" }],
      suggestedName: "Próximo pago automático",
    });
  });

  it("copia los botones y los ejemplos: editar el formulario no toca la biblioteca cargada", () => {
    const draft = libraryDraft(AUTO_PAY);
    expect(draft.buttons[0]).not.toBe(AUTO_PAY.buttons[0]);
    expect(draft.examples).not.toBe(AUTO_PAY.body_examples);
  });

  it("los tres tipos de botón llegan con la forma del formulario", () => {
    const draft = libraryDraft(
      lib({
        buttons: [
          { type: "quick_reply", text: "Sí" },
          { type: "phone_number", text: "Llamar", phone_number: "+15550001111" },
        ],
      }),
    );
    expect(draft.buttons).toEqual([
      { type: "quick_reply", text: "Sí" },
      { type: "phone_number", text: "Llamar", phone_number: "+15550001111" },
    ]);
  });
});

describe("isStillLibrary · decide si se envía con `library_template_name`", () => {
  it("recién elegida, lo es", () => {
    expect(isStillLibrary(AUTO_PAY, asLoaded(AUTO_PAY))).toBe(true);
  });

  it("cambiar el enlace del botón NO la saca: es lo que el negocio pone", () => {
    const buttons: TemplateButton[] = [{ type: "url", text: "Ver cuenta", url: "https://savage.co/cuenta" }];
    expect(isStillLibrary(AUTO_PAY, { ...asLoaded(AUTO_PAY), buttons })).toBe(true);
  });

  it.each<[string, Partial<LibraryComparable>]>([
    ["el cuerpo", { body: `${AUTO_PAY.body} Gracias.` }],
    ["la cabecera", { header: "Pago automático" }],
    ["quitar la cabecera", { header: null }],
    ["una cabecera de imagen", { header: null, hasMediaHeader: true }],
    ["añadir pie", { footer: "Responde SALIR" }],
    ["el texto de un botón", { buttons: [{ type: "url", text: "Mi cuenta", url: "https://www.example.com" }] }],
    ["el tipo de un botón", { buttons: [{ type: "quick_reply", text: "Ver cuenta" }] }],
    ["añadir un botón", { buttons: [{ type: "url", text: "Ver cuenta", url: "x" }, { type: "quick_reply", text: "No" }] }],
    ["el idioma", { language: "es_CO" }],
    ["la categoría", { category: "marketing" }],
  ])("cambiar %s la saca", (_, change) => {
    expect(isStillLibrary(AUTO_PAY, { ...asLoaded(AUTO_PAY), ...change })).toBe(false);
  });

  it("el orden de los botones cuenta", () => {
    const two = lib({
      buttons: [
        { type: "quick_reply", text: "Sí" },
        { type: "quick_reply", text: "No" },
      ],
    });
    const swapped: TemplateButton[] = [
      { type: "quick_reply", text: "No" },
      { type: "quick_reply", text: "Sí" },
    ];
    expect(isStillLibrary(two, asLoaded(two))).toBe(true);
    expect(isStillLibrary(two, { ...asLoaded(two), buttons: swapped })).toBe(false);
  });
});

describe("placeholderButtonIssue · el example.com de Meta no sale", () => {
  it("bloquea el enlace de ejemplo, nombrando el botón", () => {
    const issue = "Pon la dirección de tu negocio en «Ver cuenta»";
    expect(placeholderButtonIssue([{ type: "url", text: "Ver cuenta", url: "https://www.example.com" }])).toBe(issue);
    expect(placeholderButtonIssue([{ type: "url", text: "Ver cuenta", url: "https://example.com/pagar" }])).toBe(issue);
    expect(placeholderButtonIssue([{ type: "url", text: "Ver cuenta", url: "www.example.com" }])).toBe(issue);
    // Las de servicio público traen example.gov
    expect(placeholderButtonIssue([{ type: "url", text: "Ver cuenta", url: "https://example.gov/transit-updates" }])).toBe(
      issue,
    );
  });

  it("bloquea el teléfono de ejemplo de Meta (+1 800 555 1234), escrito como sea", () => {
    const issue = "Pon el teléfono de tu negocio en «Llamar»";
    expect(placeholderButtonIssue([{ type: "phone_number", text: "Llamar", phone_number: "+18005551234" }])).toBe(issue);
    expect(placeholderButtonIssue([{ type: "phone_number", text: "Llamar", phone_number: "+1 800-555-1234" }])).toBe(issue);
    expect(placeholderButtonIssue([{ type: "phone_number", text: "Llamar", phone_number: "+573001234567" }])).toBeNull();
  });

  it("deja pasar el del negocio y los que no son enlace", () => {
    expect(placeholderButtonIssue([{ type: "url", text: "Ver cuenta", url: "https://savage.co/cuenta" }])).toBeNull();
    expect(placeholderButtonIssue([{ type: "url", text: "Ver", url: "https://example.com.co" }])).toBeNull();
    expect(placeholderButtonIssue([{ type: "quick_reply", text: "example.com" }])).toBeNull();
    expect(placeholderButtonIssue([])).toBeNull();
  });
});

describe("la hoja: buscar, temas y lo que se asoma en la fila", () => {
  const ORDER = lib({
    name: "delivery_update_1",
    topic: "ORDER_MANAGEMENT",
    usecase: "DELIVERY_UPDATE",
    header: null,
    body: "Tu pedido {{1}} ya va en camino. Llega el {{2}}.",
    body_examples: ["#4821", "jueves 9"],
  });
  const FEEDBACK = lib({
    name: "feedback_survey_1",
    topic: "CUSTOMER_FEEDBACK",
    usecase: "FEEDBACK_SURVEY",
    header: null,
    body: "¿Cómo te fue con {{1}}? Responde del 1 al 5.",
    body_examples: ["tu pedido"],
  });
  const ALL = [AUTO_PAY, ORDER, FEEDBACK];

  it("busca sin tildes ni mayúsculas, en título, texto y caso de uso", () => {
    expect(filterLibrary(ALL, "PROXIMO", null)).toEqual([AUTO_PAY]);
    expect(filterLibrary(ALL, "camino", null)).toEqual([ORDER]);
    expect(filterLibrary(ALL, "survey", null)).toEqual([FEEDBACK]);
    expect(filterLibrary(ALL, "", null)).toEqual(ALL);
    expect(filterLibrary(ALL, "cita", null)).toEqual([]);
  });

  it("el tema filtra a la vez que la búsqueda", () => {
    expect(filterLibrary(ALL, "", "PAYMENTS")).toEqual([AUTO_PAY]);
    expect(filterLibrary(ALL, "camino", "PAYMENTS")).toEqual([]);
  });

  it("los temas son los que hay, en el orden de las etiquetas y los nuevos al final", () => {
    expect(libraryTopics([FEEDBACK, lib({ topic: "ZZZ" }), ORDER, AUTO_PAY])).toEqual([
      "PAYMENTS",
      "ORDER_MANAGEMENT",
      "CUSTOMER_FEEDBACK",
      "ZZZ",
    ]);
  });

  it("en la fila se asoma una por tema antes de repetir", () => {
    const second = lib({ name: "auto_pay_reminder_2" });
    expect(libraryHighlights([AUTO_PAY, second, ORDER, FEEDBACK], 3)).toEqual([AUTO_PAY, ORDER, FEEDBACK]);
    expect(libraryHighlights([AUTO_PAY, second], 4)).toEqual([AUTO_PAY, second]);
  });

  it("el cuerpo se parte con cada hueco cambiado por su ejemplo", () => {
    expect(libraryBodyParts("Tu pedido {{1}} llega el {{2}}.", ["#4821"])).toEqual([
      { text: "Tu pedido ", example: false },
      { text: "#4821", example: true },
      { text: " llega el ", example: false },
      { text: "{{2}}", example: true },
      { text: ".", example: false },
    ]);
  });
});
