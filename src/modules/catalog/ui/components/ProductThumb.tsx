"use client";

import { useState } from "react";
import Image from "next/image";
import { Package, Wrench } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductKind } from "@/modules/catalog/domain/product";

/**
 * Imagen de producto con fallback a icono. `image_url` es una URL externa
 * arbitraria (el backend no aloja imágenes): se usa `unoptimized` para no
 * depender de `remotePatterns`, y `onError` cae al icono del kind.
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
