import Link from "next/link"

import { cn } from "@/core/lib/utils"
import { BrandMark } from "@/shared/components/ui/brand-mark"

/**
 * Lockup de marca: isotipo + wordmark «axi connect», enlazado al inicio.
 *
 * Es UNA sola pieza para toda superficie con cabecera propia (header público,
 * menú móvil, `/comenzar`): antes cada una lo componía a mano y divergieron
 * (tamaños distintos, «Axi Connect» en texto plano en el funnel frente al
 * wordmark en degradado de la landing). El lockup no admite variantes de
 * color ni de texto a propósito; solo dos tamaños.
 *
 * `BrandMark` es SVG inline (sin fetch, escala sin pixelar) y va `aria-hidden`:
 * el nombre accesible del enlace es el wordmark visible. Con el texto por
 * debajo de 24 px habría que usar solo el isotipo (DESIGN.md §2.2); por eso el
 * tamaño mínimo aquí es `text-lg`.
 */
export function BrandLockup({
  size = "md",
  href = "/",
  className,
}: {
  size?: "sm" | "md"
  href?: string
  className?: string
}) {
  const small = size === "sm"
  return (
    <Link prefetch={false} href={href} className={cn("flex items-center gap-2", className)}>
      <BrandMark className={small ? "size-7" : "size-8"} />
      {/* `.text-brand-wordmark` es reactiva al tema: degradado coral en claro,
          blanco en oscuro (globals.css). Ya trae el recorte y el color, así que
          aquí no van `bg-clip-text` ni `text-transparent`. Sigue sin `cn()`:
          tailwind-merge toma cualquier `text-*` de color por conflicto. */}
      <span
        className={`text-brand-wordmark font-heading font-bold ${small ? "text-lg" : "text-xl"}`}
      >
        axi connect
      </span>
    </Link>
  )
}
