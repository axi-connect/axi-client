import { parseAxelText, parseInline } from "../axel-markdown";

/**
 * La gramática entera, y sobre todo los casos degenerados.
 *
 * Este parser corre también sobre texto INCOMPLETO: mientras el turno escribe,
 * cada delta reparsea lo acumulado, así que la mitad de las entradas reales son
 * frases cortadas por la mitad. Que no reviente y que lo no reconocido se vea
 * como texto es más importante que cubrir toda la sintaxis de markdown.
 */

describe("parseInline", () => {
  it("negrita, cursiva y código, en el mismo orden que los escribe el modelo", () => {
    expect(parseInline("Van **$18.420.000** en *plata* del `pos_web`")).toEqual([
      { kind: "text", text: "Van " },
      { kind: "strong", text: "$18.420.000" },
      { kind: "text", text: " en " },
      { kind: "em", text: "plata" },
      { kind: "text", text: " del " },
      { kind: "code", text: "pos_web" },
    ]);
  });

  it("el doble asterisco gana al simple: si no, la negrita saldría en cursiva", () => {
    expect(parseInline("**22 carritos**")).toEqual([{ kind: "strong", text: "22 carritos" }]);
  });

  it("dentro del código no se interpreta nada: para eso sirve", () => {
    expect(parseInline("`a **b** c`")).toEqual([{ kind: "code", text: "a **b** c" }]);
  });

  it("un delimitador sin cerrar es texto, no rompe el resto de la línea", () => {
    // El caso de cada segundo mientras Axel escribe.
    expect(parseInline("Tienes **22 carritos")).toEqual([
      { kind: "text", text: "Tienes **22 carritos" },
    ]);
    expect(parseInline("mitad de `algo")).toEqual([{ kind: "text", text: "mitad de `algo" }]);
  });

  it("un delimitador vacío es texto: `****` no es una negrita", () => {
    expect(parseInline("****")).toEqual([{ kind: "text", text: "****" }]);
  });

  it("una línea vacía no produce nada", () => {
    expect(parseInline("")).toEqual([]);
  });
});

describe("parseAxelText", () => {
  it("separa párrafos por línea en blanco y conserva los saltos de dentro", () => {
    // El salto NO se colapsa en espacio: Axel escribe listas sin viñeta y unir
    // dos afirmaciones cambia lo que dijo.
    const blocks = parseAxelText("Marcela — 92\nDiana — 88\n\nY eso es todo.");
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      kind: "paragraph",
      spans: [
        { kind: "text", text: "Marcela — 92" },
        { kind: "break" },
        { kind: "text", text: "Diana — 88" },
      ],
    });
  });

  it("reconoce el título con dos almohadillas, y tolera una o tres", () => {
    for (const prefix of ["#", "##", "###"]) {
      const blocks = parseAxelText(`${prefix} La fuga son los carritos`);
      expect(blocks[0]).toEqual({
        kind: "heading",
        spans: [{ kind: "text", text: "La fuga son los carritos" }],
      });
    }
  });

  it("varias líneas de cita son UNA cita", () => {
    const blocks = parseAxelText("> Empieza por los carritos.\n> Es la fuga grande.");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.kind).toBe("quote");
  });

  it("agrupa las viñetas en una lista y conserva su formato interno", () => {
    const blocks = parseAxelText("- 30 sin **respuesta**\n- 17 estancadas");
    expect(blocks).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [
          {
            number: null,
            spans: [
              { kind: "text", text: "30 sin " },
              { kind: "strong", text: "respuesta" },
            ],
          },
          { number: null, spans: [{ kind: "text", text: "17 estancadas" }] },
        ],
      },
    ]);
  });

  it("la lista numerada recuerda su número: una que empieza en 3 no se renumera", () => {
    const blocks = parseAxelText("3. Marcela\n4. Diana");
    expect(blocks[0]).toMatchObject({
      kind: "list",
      ordered: true,
      items: [{ number: 3 }, { number: 4 }],
    });
  });

  it("cambiar de tipo de lista abre otra: no se mezclan viñetas con números", () => {
    const blocks = parseAxelText("- uno\n1. dos");
    expect(blocks.map((block) => block.kind)).toEqual(["list", "list"]);
    expect(blocks[0]).toMatchObject({ ordered: false });
    expect(blocks[1]).toMatchObject({ ordered: true });
  });

  it("un guion sin espacio NO es una viñeta: es un texto que empieza por guion", () => {
    const blocks = parseAxelText("-30% de cierre");
    expect(blocks[0]?.kind).toBe("paragraph");
  });

  it("el texto corriente cierra la lista y la cita abiertas", () => {
    const blocks = parseAxelText("- uno\nY esto ya no es de la lista.");
    expect(blocks.map((block) => block.kind)).toEqual(["list", "paragraph"]);
  });

  it("texto vacío o solo espacios no produce bloques", () => {
    expect(parseAxelText("")).toEqual([]);
    expect(parseAxelText("\n\n   \n")).toEqual([]);
  });

  it("una respuesta a medio escribir se parsea sin perder lo que ya llegó", () => {
    // Exactamente lo que llega en un delta intermedio.
    const blocks = parseAxelText("## La fuga son los carr");
    expect(blocks[0]).toEqual({
      kind: "heading",
      spans: [{ kind: "text", text: "La fuga son los carr" }],
    });
    expect(parseAxelText("- uno\n- do")).toMatchObject([{ kind: "list" }]);
  });
});
