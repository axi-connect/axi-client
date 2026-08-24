/**
 * El formato de las respuestas de Axel: de texto a un árbol que el design
 * system sabe pintar.
 *
 * La cadena completa es: el prompt le declara al modelo un subconjunto cerrado
 * de markdown (regla dura 6) → este parser lo convierte en bloques → el
 * componente mapea cada bloque a la tipografía del sistema. Cuatro decisiones
 * que explican la forma que tiene:
 *
 * 1. **Nunca HTML.** No se genera ni se interpreta una sola etiqueta: el parser
 *    devuelve datos y React construye los elementos. El repositorio no tiene un
 *    solo `dangerouslySetInnerHTML` y no lo estrena con texto que sale de un
 *    modelo y lleva dentro datos del negocio.
 * 2. **Lo que no se reconoce es texto.** Un `**` sin cerrar se ve como dos
 *    asteriscos. Esto se ejecuta también sobre texto INCOMPLETO —mientras el
 *    turno escribe, cada delta reparsea— así que la mitad de las veces la
 *    entrada es una frase cortada por la mitad: reventar no es una opción.
 * 3. **Un salto de línea es un salto de línea.** Markdown los colapsaría en un
 *    espacio, pero Axel escribe listas sin viñeta («Marcela — 92») y unir dos
 *    afirmaciones en una línea cambia lo que dijo. Se conservan como `break`.
 * 4. **Extensible por diseño.** Añadir un tipo de bloque es un caso en el
 *    parser y un caso en el componente; nada más lo conoce.
 */

export type Span =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  /** Salto de línea DENTRO de un párrafo (el modelo lo escribió). */
  | { kind: "break" };

export interface ListItem {
  /** Número que escribió el modelo, para que una lista que empieza en 3 no se renumere. */
  number: number | null;
  spans: Span[];
}

export type Block =
  | { kind: "paragraph"; spans: Span[] }
  | { kind: "heading"; spans: Span[] }
  | { kind: "quote"; spans: Span[] }
  | { kind: "list"; ordered: boolean; items: ListItem[] };

/** `## Título` (uno a tres almohadillas: el prompt pide dos, se toleran más). */
const HEADING = /^ {0,3}#{1,3}\s+(.*)$/;
/** `> Recomendación`, con o sin espacio. */
const QUOTE = /^ {0,3}>\s?(.*)$/;
/** `- punto` o `* punto` (el asterisco solo si le sigue un espacio). */
const BULLET = /^ {0,3}[-*]\s+(.*)$/;
/** `1. punto` o `1) punto`. */
const ORDERED = /^ {0,3}(\d{1,3})[.)]\s+(.*)$/;

export function parseAxelText(body: string): Block[] {
  const blocks: Block[] = [];
  // Buffers del bloque en construcción: solo uno está activo a la vez.
  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { ordered: boolean; items: ListItem[] } | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", spans: parseLines(paragraph) });
    paragraph = [];
  };
  const flushQuote = (): void => {
    if (quote.length === 0) return;
    blocks.push({ kind: "quote", spans: parseLines(quote) });
    quote = [];
  };
  const flushList = (): void => {
    if (list === null) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = null;
  };
  const flushAll = (): void => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (const raw of body.split("\n")) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushAll();
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      flushAll();
      blocks.push({ kind: "heading", spans: parseInline(heading[1]) });
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted !== null) {
      // Una cita corta cualquier otro bloque abierto, pero varias líneas
      // seguidas de cita son UNA sola cita.
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered !== null) {
      flushParagraph();
      flushQuote();
      if (list === null || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push({ number: Number(ordered[1]), spans: parseInline(ordered[2]) });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet !== null) {
      flushParagraph();
      flushQuote();
      if (list === null || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push({ number: null, spans: parseInline(bullet[1]) });
      continue;
    }

    // Texto corriente. Si venía una lista o una cita, esta línea las cierra:
    // sin línea en blanco de por medio, seguir dentro sería adivinar.
    flushQuote();
    flushList();
    paragraph.push(line);
  }

  flushAll();
  return blocks;
}

/** Varias líneas de un mismo bloque, con sus saltos conservados. */
function parseLines(lines: string[]): Span[] {
  const spans: Span[] = [];
  lines.forEach((line, index) => {
    if (index > 0) spans.push({ kind: "break" });
    spans.push(...parseInline(line));
  });
  return spans;
}

/** Delimitadores en línea, del más específico al más general. */
const MARKS = [
  { open: "`", kind: "code" as const },
  { open: "**", kind: "strong" as const },
  { open: "*", kind: "em" as const },
];

/**
 * Escáner de una pasada sobre una línea.
 *
 * El código va primero y es opaco: dentro de comillas invertidas no se
 * interpreta nada, que es justo para lo que sirven. Un delimitador sin cierre —o
 * con el cierre pegado, como `**` vacío— se emite como texto literal y el
 * escáner sigue desde el carácter siguiente: así una frase a medio escribir se
 * ve como lo que es, no rota el resto de la línea.
 */
export function parseInline(line: string): Span[] {
  const spans: Span[] = [];
  let plain = "";
  let at = 0;

  const pushPlain = (): void => {
    if (plain !== "") {
      spans.push({ kind: "text", text: plain });
      plain = "";
    }
  };

  while (at < line.length) {
    const mark = MARKS.find((candidate) => line.startsWith(candidate.open, at));
    if (mark === undefined) {
      plain += line[at];
      at += 1;
      continue;
    }
    const from = at + mark.open.length;
    const close = line.indexOf(mark.open, from);
    if (close === -1 || close === from) {
      plain += mark.open;
      at += mark.open.length;
      continue;
    }
    pushPlain();
    spans.push({ kind: mark.kind, text: line.slice(from, close) });
    at = close + mark.open.length;
  }

  pushPlain();
  return spans;
}
