import { Copy, CornerUpLeft, ExternalLink, Phone } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { visibleButtons, type TemplateButton } from "@/modules/marketing/domain/template-pieces";

/**
 * «Así se verá»: el mensaje ENTERO como lo recibe el cliente —cabecera, cuerpo
 * con los ejemplos, pie y botones— con los colores de WhatsApp (`.wa-preview`
 * en globals.css). Antes solo se veía el cuerpo, así que una cabecera o un
 * botón mal puesto se descubría en el teléfono del cliente.
 */
export function HsmPreview({
  header,
  body,
  examples,
  footer,
  buttons,
  className,
}: {
  header: string | null;
  body: string;
  examples: readonly string[];
  footer: string | null;
  buttons: readonly TemplateButton[];
  className?: string;
}) {
  const { shown, hidden } = visibleButtons(buttons);
  const segments = renderSegments(body, examples);
  return (
    <div className={cn("wa-preview flex flex-col rounded-3xl p-4 sm:p-5", className)}>
      <div className="wa-bubble max-w-xs self-start overflow-hidden rounded-[4px_14px_14px_14px]">
        <div className="flex flex-col gap-1 px-3 pt-2 pb-1.5 text-sm leading-snug">
          {header?.trim() ? <p className="font-bold text-pretty">{header}</p> : null}
          <p className="text-pretty whitespace-pre-line">
            {body.trim() === "" ? (
              <span className="wa-muted">Escribe el texto y aquí verás el mensaje.</span>
            ) : (
              segments.map((segment, index) =>
                segment.variable ? (
                  <mark key={String(index)} className="wa-mark">
                    {segment.text}
                  </mark>
                ) : (
                  <span key={String(index)}>{segment.text}</span>
                ),
              )
            )}
          </p>
          {footer?.trim() ? <p className="wa-muted text-[12.5px] text-pretty">{footer}</p> : null}
          <span className="wa-muted self-end text-[11px] tabular-nums">9:41</span>
        </div>
        {shown.map((button, index) => (
          <p key={String(index)} className="wa-link flex h-10 items-center justify-center gap-1.5 px-3 text-sm font-medium">
            <ButtonIcon button={button} />
            <span className="truncate">{buttonLabel(button)}</span>
          </p>
        ))}
        {hidden > 0 && (
          <p className="wa-link flex h-10 items-center justify-center px-3 text-sm font-medium">Ver todas las opciones</p>
        )}
      </div>
    </div>
  );
}

function ButtonIcon({ button }: { button: TemplateButton }) {
  const className = "size-3.5 shrink-0";
  switch (button.type) {
    case "quick_reply":
      return <CornerUpLeft aria-hidden className={className} />;
    case "url":
      return <ExternalLink aria-hidden className={className} />;
    case "phone_number":
      return <Phone aria-hidden className={className} />;
    case "copy_code":
      return <Copy aria-hidden className={className} />;
  }
}

function buttonLabel(button: TemplateButton): string {
  if (button.type === "copy_code") return "Copiar código";
  return button.text.trim() || "Botón sin texto";
}

/** El cuerpo en trozos: los `{{n}}` se rellenan con su ejemplo (o se dejan tal cual si no lo hay). */
export function renderSegments(body: string, examples: readonly string[]): Array<{ text: string; variable: boolean }> {
  const segments: Array<{ text: string; variable: boolean }> = [];
  let cursor = 0;
  for (const match of body.matchAll(/\{\{(\d+)\}\}/g)) {
    if (match.index > cursor) segments.push({ text: body.slice(cursor, match.index), variable: false });
    const example = examples[Number(match[1]) - 1]?.trim();
    segments.push({ text: example ? example : match[0], variable: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < body.length) segments.push({ text: body.slice(cursor), variable: false });
  return segments;
}
