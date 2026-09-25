"use client"

import { useEffect, useRef } from "react"
import { BrandMark } from "@/shared/components/ui/brand-mark"

/**
 * Marco común de las páginas de contraseña: isotipo, un título, una frase y la
 * tarjeta con el contenido. Cada cambio de estado (formulario → éxito, válido →
 * vencido) cambia el título, y el foco va a él: así un lector de pantalla
 * anuncia el estado nuevo en vez de quedarse sobre un botón que ya no existe.
 */
export function PasswordShell({
  title,
  description,
  children,
  footer,
  focusOnMount = false,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  /** El primer estado de la página no roba el foco (el campo lleva autoFocus). */
  focusOnMount?: boolean
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  useEffect(() => {
    if (firstRender.current && !focusOnMount) {
      firstRender.current = false
      return
    }
    firstRender.current = false
    headingRef.current?.focus()
  }, [title, focusOnMount])

  return (
    <div className="mt-10 w-full space-y-6 px-4 pb-10 sm:mt-14 sm:px-0">
      <header className="space-y-3 text-center">
        <BrandMark className="mx-auto size-12" />
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-bold tracking-tight outline-none sm:text-3xl"
        >
          {title}
        </h1>
        {description ? <p className="text-muted-foreground mx-auto max-w-sm text-sm text-pretty">{description}</p> : null}
      </header>
      {children ? (
        <div className="border-border bg-card rounded-2xl border p-4 shadow-sm sm:p-6">{children}</div>
      ) : null}
      {footer ? <div className="text-muted-foreground space-y-2 text-center text-sm">{footer}</div> : null}
    </div>
  )
}
