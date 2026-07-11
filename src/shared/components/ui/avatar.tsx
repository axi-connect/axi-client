"use client"

import { useEffect, useState } from "react"
import { cn } from "@/core/lib/utils"

type AvatarProps = {
  /** URL de la imagen. Null/vacío → fallback de inicial. */
  src?: string | null
  alt: string
  /** Texto del que se toma la inicial de fallback (nombre de usuario/empresa). */
  fallback?: string
  /** Tamaño en px (ancho = alto). Default 32. */
  size?: number
  /** `circle` para personas, `square` (rounded-md) para logos/empresas. */
  shape?: "circle" | "square"
  className?: string
}

/**
 * Avatar/logo con fallback robusto: muestra la inicial sobre `bg-muted` si no
 * hay `src` o si la imagen falla al cargar (URL rota, host caído).
 *
 * Usa `<img>` nativo a propósito: `avatar_url`/`isotype_url` son URLs
 * arbitrarias por tenant y `next/image` lanza error con hosts fuera de
 * `remotePatterns`; a 32–40px la optimización no aporta y la resiliencia sí.
 */
export function Avatar({
  src,
  alt,
  fallback,
  size = 32,
  shape = "circle",
  className,
}: AvatarProps) {
  const [failed, setFailed] = useState(false)

  // Si cambia la URL (p.ej. el usuario actualiza su avatar), reintentar.
  useEffect(() => {
    setFailed(false)
  }, [src])

  const initial = fallback?.trim().charAt(0).toUpperCase() || "A"
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md"
  const style = { width: size, height: size }

  if (!src || failed) {
    return (
      <span
        role="img"
        aria-label={alt}
        style={style}
        className={cn(
          "flex shrink-0 select-none items-center justify-center bg-muted text-xs font-medium",
          shapeClass,
          className,
        )}
      >
        {initial}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver docstring: URLs por tenant fuera de remotePatterns
    <img
      src={src}
      alt={alt}
      style={style}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("shrink-0 bg-muted object-cover", shapeClass, className)}
    />
  )
}
