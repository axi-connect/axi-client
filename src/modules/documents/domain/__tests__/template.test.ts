import {
  appendBlock,
  blockSummary,
  blockTexts,
  extractVariableNames,
  moveBlock,
  moveBlockToEdge,
  newBlock,
  newBlockId,
  removeBlock,
  templateHash,
  unknownTemplateVariables,
  updateBlock,
  type TemplateDocument,
  type TemplateVariableView,
} from "@/modules/documents/domain/template";

const variables: TemplateVariableView[] = [
  {
    name: "contact_name",
    label: "Nombre del cliente",
    domain: "counterparty",
    kind: "text",
  },
  { name: "total", label: "Total", domain: "commerce", kind: "money" },
];

const template: TemplateDocument = {
  schema_version: 1,
  theme: { accent_color: null },
  blocks: [
    { id: "h", type: "heading", text: "Contrato {{document_number}}" },
    {
      id: "p",
      type: "paragraph",
      text: "Hola {{ contact_name }}, total {{total}}",
    },
    {
      id: "c",
      type: "clauses",
      numbered: true,
      items: [{ title: "Objeto {{numero}}", body: "cuerpo {{contact_name}}" }],
    },
    {
      id: "s",
      type: "signatures",
      issuer_label: "Agencia",
      counterparty_label: "Viajero",
      show_date: true,
    },
  ],
};

describe("variables de plantilla", () => {
  it("extrae nombres completos, sin repetir y tolerando espacios; un token a medias no cuenta", () => {
    expect(
      extractVariableNames("{{ total }} y {{total}} y {{contact_name}} y {{re"),
    ).toEqual(["total", "contact_name"]);
  });

  it("solo son desconocidas las que el servidor NO mandó — la lista viene del wire", () => {
    expect(unknownTemplateVariables(template, variables)).toEqual([
      "document_number",
      "numero",
    ]);
    expect(
      unknownTemplateVariables(template, [
        ...variables,
        {
          name: "document_number",
          label: "",
          domain: "document",
          kind: "text",
        },
        { name: "numero", label: "", domain: "x", kind: "text" },
      ]),
    ).toEqual([]);
  });

  it("los textos de un bloque incluyen títulos de cláusulas y etiquetas de partes/firmas", () => {
    expect(blockTexts(template.blocks[2]!)).toEqual([
      "Objeto {{numero}}",
      "cuerpo {{contact_name}}",
    ]);
    expect(blockTexts(template.blocks[3]!)).toEqual(["Agencia", "Viajero"]);
    expect(blockTexts({ id: "d", type: "divider" })).toEqual([]);
  });
});

describe("operaciones del editor (puras)", () => {
  it("mover arriba/abajo y a los extremos no pierde bloques ni muta la plantilla", () => {
    const down = moveBlock(template, "h", 1);
    expect(down.blocks.map((b) => b.id)).toEqual(["p", "h", "c", "s"]);
    expect(template.blocks.map((b) => b.id)).toEqual(["h", "p", "c", "s"]);
    expect(moveBlock(template, "h", -1)).toBe(template);
    expect(
      moveBlockToEdge(template, "s", "start").blocks.map((b) => b.id),
    ).toEqual(["s", "h", "p", "c"]);
    expect(
      moveBlockToEdge(template, "h", "end").blocks.map((b) => b.id),
    ).toEqual(["p", "c", "s", "h"]);
  });

  it("quitar, actualizar y añadir", () => {
    expect(removeBlock(template, "p").blocks).toHaveLength(3);
    const updated = updateBlock(template, {
      id: "h",
      type: "heading",
      text: "Otro",
    });
    expect(updated.blocks[0]).toEqual({
      id: "h",
      type: "heading",
      text: "Otro",
    });
    const id = newBlockId("paragraph", template.blocks);
    expect(id).toMatch(/^paragraph_[a-z0-9]{5}$/);
    expect(
      appendBlock(template, newBlock("paragraph", id)).blocks.at(-1),
    ).toEqual({ id, type: "paragraph", text: "" });
  });

  it("la huella cambia con el contenido y no con la identidad del objeto", () => {
    expect(templateHash(template)).toBe(templateHash({ ...template }));
    expect(templateHash(template)).not.toBe(
      templateHash(removeBlock(template, "s")),
    );
  });

  it("cada tipo de bloque tiene un bloque vacío y un resumen de una línea", () => {
    const types = [
      "heading",
      "paragraph",
      "clauses",
      "key_values",
      "parties",
      "line_items_table",
      "totals",
      "schedule_table",
      "payment_summary",
      "signatures",
      "image",
      "legal_notice",
      "page_footer",
      "divider",
      "spacer",
    ] as const;
    for (const type of types) {
      const block = newBlock(type, `${type}_x`);
      expect(block.type).toBe(type);
      expect(typeof blockSummary(block)).toBe("string");
    }
    expect(blockSummary(newBlock("image", "i"))).toBe(
      "El isotipo del negocio, a la izquierda",
    );
    expect(
      blockSummary({
        id: "c",
        type: "clauses",
        numbered: true,
        items: [
          { title: "Objeto", body: "x" },
          { title: null, body: "y" },
        ],
      }),
    ).toBe("2 cláusulas · Objeto, Sin título");
  });
});

describe("QA F7: todo hueco «{{ }}» se juzga, calce o no el formato", () => {
  it("una variable conocida pasa; mayúsculas, puntos, espacios y el hueco vacío se marcan", () => {
    const available = [
      { name: "document_number" },
      { name: "customer_name" },
    ] as unknown as Parameters<typeof unknownTemplateVariables>[1];
    const template = {
      blocks: [
        {
          id: "h",
          type: "heading",
          text: "Hola {{customer_name}} y {{Cliente}} con {{cliente.mascota}}, {{fecha de salida}} {{ }}",
        },
      ],
    } as unknown as Parameters<typeof unknownTemplateVariables>[0];
    expect(unknownTemplateVariables(template, available)).toEqual([
      "Cliente",
      "cliente.mascota",
      "fecha de salida",
      "{{ }}",
    ]);
    expect(
      extractVariableNames("{{ document_number }} y {{document_number}}"),
    ).toEqual(["document_number"]);
  });
});
