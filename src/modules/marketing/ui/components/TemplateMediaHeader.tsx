"use client";

import { useState } from "react";
import { FileText, ImageIcon, Play } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { HeaderMediaKind } from "@/modules/marketing/domain/header-media";
import type { HsmHeaderMediaDTO } from "@/modules/marketing/domain/template-catalog";

const LABEL: Record<HeaderMediaKind, string> = {
  image: "Imagen de la plantilla",
  video: "Video de la plantilla",
  document: "Documento de la plantilla",
};

/**
 * La cabecera de medio de una plantilla tal como sale en una burbuja (hsm-media,
 * fase de previas): la imagen de verdad cuando axi tiene su copia, el póster del
 * video o la ficha del documento. Una sola pieza para el asistente de campañas y
 * la bandeja, que antes enseñaban solo el texto o un hueco «Imagen de la
 * plantilla».
 *
 * La previa es una URL firmada que caduca (1 h): si falla al cargar, se vuelve
 * al hueco con su icono en vez de enseñar una imagen rota. Pinta con
 * `currentColor`, así hereda el color de la burbuja donde vaya.
 */
export function TemplateMediaHeader({
  kind,
  media,
  className,
}: {
  kind: HeaderMediaKind;
  /** El medio guardado de la plantilla; `null` si axi no tiene copia (creada en Meta). */
  media: HsmHeaderMediaDTO | null | undefined;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const url = media?.preview_url ?? null;

  if (kind === "document") {
    return (
      <span className={cn("flex items-center gap-2.5 rounded-xl bg-current/10 p-2.5", className)}>
        <FileText aria-hidden className="size-5 shrink-0 opacity-80" />
        <span className="min-w-0 truncate text-xs font-medium">{media?.file_name ?? LABEL.document}</span>
      </span>
    );
  }

  if (kind === "image" && url !== null && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL firmada que caduca: next/image no aporta nada aquí
      <img
        src={url}
        alt={LABEL.image}
        onError={() => setBroken(true)}
        className={cn("block aspect-[1.91/1] w-full rounded-xl object-cover", className)}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={LABEL[kind]}
      className={cn("flex aspect-[1.91/1] w-full items-center justify-center gap-1.5 rounded-xl bg-current/10 text-xs", className)}
    >
      {kind === "video" ? (
        <span aria-hidden className="grid size-10 place-items-center rounded-full bg-current/15">
          <Play className="size-4.5 opacity-80" />
        </span>
      ) : (
        <>
          <ImageIcon aria-hidden className="size-4 opacity-80" />
          <span className="opacity-80">{LABEL.image}</span>
        </>
      )}
    </span>
  );
}
