import { cn } from "@/core/lib/utils"
import { BrandMark } from "@/shared/components/ui/brand-mark"

const SIZE_CLASSES = {
  sm: "size-10",
  md: "size-16",
  lg: "size-24",
} as const

type BrandLoaderProps = {
  /** Tamaño del isotipo. Default `md`. */
  size?: keyof typeof SIZE_CLASSES
  /** Cubre la vista completa (`fixed inset-0`) con fondo sólido. */
  fullScreen?: boolean
  /** Texto accesible (y visible si `showLabel`). Default "Cargando". */
  label?: string
  /** Muestra el label bajo el logo. */
  showLabel?: boolean
  className?: string
}

/**
 * Loader central de marca: isotipo con pulso sutil (CSS `brand-pulse`, se
 * desactiva con `prefers-reduced-motion`). Es RSC-compatible: usable en los
 * `loading.tsx` de ruta sin `"use client"`.
 *
 * Cuándo usarlo (DESIGN-SYSTEM, "Estados de carga"): cargas de vista cuya
 * estructura no es predecible. Si la forma de la UI es conocida (tabla,
 * lista, sidebar), usar un skeleton estructural en su lugar.
 */
export function BrandLoader({
  size = "md",
  fullScreen = false,
  label = "Cargando",
  showLabel = false,
  className,
}: BrandLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullScreen ? "fixed inset-0 z-50 bg-background" : "p-8",
        className,
      )}
    >
      <span className="relative flex items-center justify-center">
        {/* Glow de marca detrás del isotipo, sutil en light y dark */}
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 scale-150 rounded-full bg-brand-gradient-tri opacity-15 blur-2xl"
        />
        <BrandMark className={cn(SIZE_CLASSES[size], "animate-brand-pulse")} />
      </span>
      <span className={showLabel ? "text-sm text-muted-foreground" : "sr-only"}>
        {label}
      </span>
    </div>
  )
}
