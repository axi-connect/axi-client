"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Wrench } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductKind } from "@/modules/catalog/domain/product";

/**
 * Miniatura de la foto PRINCIPAL del producto (plan catalog_images_gallery):
 * la que pintan la tabla, las tarjetas y la cabecera, y la que el agente envía
 * primero. Es el thumb de 320 px que sirve el propio storage de axi, firmado
 * con ventana estable de una hora: el navegador la cachea tal cual, así que va
 * `unoptimized` (el optimizador de Next la volvería a pedir con otra clave y
 * no reconoce el host firmado). Sin foto o si falla, el icono del kind.
 */
export function ProductThumb({
  src,
  alt,
  kind,
  className,
  iconClassName,
  sizes,
}: {
  src: string | null;
  alt: string;
  kind: ProductKind;
  className?: string;
  iconClassName?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const Icon = kind === "service" ? Wrench : Package;

  if (!src || failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)} aria-hidden>
        <Icon className={cn("h-5 w-5", iconClassName)} />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        unoptimized
        sizes={sizes ?? "64px"}
        className="object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
