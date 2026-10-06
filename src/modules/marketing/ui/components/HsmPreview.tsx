import { Copy, CornerUpLeft, ExternalLink, FileText, ImageIcon, Phone, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { HeaderMediaKind } from "@/modules/marketing/domain/header-media";
import { visibleButtons, type TemplateButton } from "@/modules/marketing/domain/template-pieces";

/**
 * «Así se verá»: el mensaje ENTERO como lo recibe el cliente —cabecera, cuerpo
 * con los ejemplos, pie y botones— con los colores de WhatsApp (`.wa-preview`
 * en globals.css). Antes solo se veía el cuerpo, así que una cabecera o un
 * botón mal puesto se descubría en el teléfono del cliente.
 */
export function HsmPreview({
  header,
  media = null,
  body,
  examples,
  footer,
  buttons,
  className,
}: {
  header: string | null;
  /**
   * La cabecera de imagen, video o documento (F4). `url`: la previa local del
   * archivo recién elegido o la firmada del guardado; `null` mientras no hay.
   */
  media?: { kind: HeaderMediaKind; url: string | null; fileName?: string } | null;
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
        {media !== null ? <MediaHeader media={media} /> : null}
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

/** La cabecera de medio como la pinta WhatsApp: la imagen recortada, el póster del video o la ficha del documento. */
function MediaHeader({ media }: { media: { kind: HeaderMediaKind; url: string | null; fileName?: string } }) {
  if (media.kind === "document") {
    return (
      <div className="wa-media mx-1 mt-1 grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-2.5 rounded-[10px] p-2.5">
        <span aria-hidden className="bg-destructive text-background grid h-10 w-9 place-items-center rounded-md">
          <FileText className="size-4.5" />
        </span>
        <span className="min-w-0 truncate text-[13px] font-medium">{media.fileName ?? "Documento"}</span>
      </div>
    );
  }
  if (media.kind === "video") {
    return (
      <div className="wa-video mx-1 mt-1 grid aspect-[1.91/1] place-items-center rounded-[10px]" aria-label="Video de la cabecera" role="img">
        <span aria-hidden className="grid size-11 place-items-center rounded-full bg-current/20">
          <Play className="size-5" />
        </span>
      </div>
    );
  }
  return media.url === null ? (
    <div className="wa-media mx-1 mt-1 grid aspect-[1.91/1] place-items-center rounded-[10px]" aria-label="Imagen de la cabecera" role="img">
      <ImageIcon aria-hidden className="size-6" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- previa local (object URL) o firmada que caduca: next/image no aporta nada aquí
    <img src={media.url} alt="Imagen de la cabecera" className="mx-1 mt-1 block aspect-[1.91/1] w-[calc(100%-0.5rem)] rounded-[10px] object-cover" />
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
