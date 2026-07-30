"use client";

import { useState } from "react";
import Image from "next/image";

import { cn } from "@/core/lib/utils";

/**
 * Logo de empresa de la banda de prueba social, con efecto de carga blur-up:
 * entra borroso y translúcido y transiciona a nítido cuando la imagen
 * termina de cargar (sin necesitar `blurDataURL`). Tamaño estandarizado:
 * alto fijo igual para todos los logos, ancho proporcional.
 *
 * Sin `src` (o con la URL rota) cae al wordmark tipográfico del negocio —
 * nunca un avatar ni un icono de imagen rota.
 */
export function BrandLogo({
  src,
  name,
  height = 48,
  className,
}: {
  src?: string | null;
  name: string;
  /** Alto de render del logo en px (el ancho es proporcional). */
  height?: number;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  /* URL rota (404, asset borrado…) → wordmark, nunca un icono de imagen rota */
  if (!src || failed) {
    return (
      <span
        className={cn(
          "font-heading text-foreground/70 text-xl font-bold tracking-tight whitespace-nowrap",
          className,
        )}
      >
        {name}
      </span>
    );
  }

  return (
    <Image
      src={src}
      alt={`Logo de ${name}`}
      width={height * 3}
      height={height}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      className={cn(
        "object-contain transition-[filter,opacity,transform] duration-500 ease-out",
        loaded ? "opacity-100 blur-0" : "scale-[0.98] opacity-40 blur-md",
        className,
      )}
      style={{ height, width: "auto" }}
    />
  );
}
