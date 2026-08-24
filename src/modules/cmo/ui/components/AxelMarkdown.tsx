import { Fragment, useMemo } from "react";

import { cn } from "@/core/lib/utils";
import {
  parseAxelText,
  type Block,
  type ListItem,
  type Span,
} from "@/modules/cmo/domain/axel-markdown";

/**
 * La respuesta de Axel, con la tipografía del sistema.
 *
 * El parser devuelve datos y esto los convierte en elementos: no hay HTML por
 * medio en ningún punto. Cada nodo se mapea a DESIGN-SYSTEM §3 y no a estilos
 * propios, que es lo que hace que una respuesta de Axel se lea como parte del
 * panel y no como un correo pegado dentro.
 *
 * Dos detalles que el mockup destapó y que aquí NO se repiten:
 *
 * · Las listas son `<ul>`/`<ol>` nativas con la variante `marker:`. La versión
 *   de prueba maquetaba cada punto con `display:flex` y `gap`, y eso convierte
 *   CADA `<strong>` del texto en un ítem flex: las cifras aparecían separadas de
 *   la coma que las sigue. El flujo en línea del texto no se toca.
 * · `tabular-nums` NO entra en prosa. En texto corrido el ancho fijo del último
 *   dígito se lee como un espacio antes del signo de puntuación; el sistema lo
 *   reserva a columnas de cifras (§3.2).
 */
export function AxelMarkdown({
  text,
  /** Pinta el cursor al final: la respuesta se está escribiendo todavía. */
  caret = false,
  className,
}: {
  text: string;
  caret?: boolean;
  className?: string;
}) {
  // Memo por texto: durante el streaming este componente re-renderiza en cada
  // delta sobre el texto ACUMULADO, y re-parsear todo cada vez era O(n²) en el
  // camino más caliente de la vista (F6 de la auditoría).
  const blocks = useMemo(() => parseAxelText(text), [text]);
  return (
    <div className={cn("text-[13.5px] leading-relaxed", className)}>
      {blocks.map((block, index) => (
        <BlockNode
          key={index}
          block={block}
          first={index === 0}
          caret={caret && index === blocks.length - 1}
        />
      ))}
      {/* Sin un solo bloque todavía (el primer delta aún no trae texto útil) el
          cursor necesita algo donde vivir. */}
      {caret && blocks.length === 0 ? <Caret /> : null}
    </div>
  );
}

function BlockNode({
  block,
  first,
  caret,
}: {
  block: Block;
  first: boolean;
  caret: boolean;
}) {
  if (block.kind === "heading") {
    return (
      <p
        className={cn(
          "font-heading text-[14.5px] leading-snug font-bold text-foreground",
          first ? "mb-1.5" : "mt-3.5 mb-1.5",
        )}
      >
        <Spans spans={block.spans} />
        {caret ? <Caret /> : null}
      </p>
    );
  }

  if (block.kind === "quote") {
    return (
      <div
        className={cn(
          "rounded-r-md border-l-2 border-accent-violet/40 bg-accent-violet/5 py-2 pr-3 pl-3",
          "text-foreground",
          first ? "mb-2.5" : "my-2.5",
        )}
      >
        <Spans spans={block.spans} />
        {caret ? <Caret /> : null}
      </div>
    );
  }

  if (block.kind === "list") {
    const start = block.items[0]?.number ?? 1;
    const items = block.items.map((item, index) => (
      <ListItemNode
        key={index}
        item={item}
        caret={caret && index === block.items.length - 1}
      />
    ));
    return block.ordered ? (
      <ol
        start={start}
        className={cn(
          "list-decimal pl-5 marker:font-semibold marker:text-accent-violet",
          first ? "mb-2.5" : "my-2.5",
        )}
      >
        {items}
      </ol>
    ) : (
      <ul
        className={cn(
          "list-disc pl-5 marker:text-accent-violet",
          first ? "mb-2.5" : "my-2.5",
        )}
      >
        {items}
      </ul>
    );
  }

  return (
    <p className={first ? "" : "mt-2.5"}>
      <Spans spans={block.spans} />
      {caret ? <Caret /> : null}
    </p>
  );
}

function ListItemNode({ item, caret }: { item: ListItem; caret: boolean }) {
  return (
    <li className="py-0.5 pl-1">
      <Spans spans={item.spans} />
      {caret ? <Caret /> : null}
    </li>
  );
}

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Fragment key={index}>{spanNode(span)}</Fragment>
      ))}
    </>
  );
}

function spanNode(span: Span): React.ReactNode {
  switch (span.kind) {
    case "strong":
      // La cifra que importa: sube de color, no de tamaño. La jerarquía la hacen
      // el peso y el tamaño, y el color queda para lo secundario (§3.2).
      return <strong className="font-semibold text-foreground">{span.text}</strong>;
    case "em":
      return <em className="italic">{span.text}</em>;
    case "code":
      return (
        <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">
          {span.text}
        </code>
      );
    case "break":
      return <br />;
    default:
      return span.text;
  }
}

/** El cursor de la respuesta en curso. Decorativo: no se anuncia. */
function Caret() {
  return (
    <span
      aria-hidden="true"
      className="ml-0.5 inline-block h-[1em] w-0.5 translate-y-[0.15em] animate-pulse bg-accent-violet align-baseline"
    />
  );
}
