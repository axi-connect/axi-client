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
  aside,
}: {
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  /** El primer estado de la página no roba el foco (el campo lleva autoFocus). */
  focusOnMount?: boolean
  /**
   * Panel de marca a la izquierda (en el celular, una cabecera de tinta). Con
   * él la página pasa a dos paneles; sin él, la tarjeta angosta de siempre.
   */
  aside?: React.ReactNode
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

  const heading = (
    <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight outline-none sm:text-3xl">
      {title}
    </h1>
  )

  if (aside) {
    return (
      <div data-auth-wide className="w-full px-4 py-8 sm:px-0 sm:py-14">
        <div className="border-border bg-card grid overflow-hidden rounded-3xl border shadow-[var(--shadow-overlay)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <aside className="bg-foreground text-background dark:border-border dark:bg-muted dark:text-foreground relative isolate overflow-hidden p-6 sm:p-10 lg:border-r lg:p-12">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-[28rem] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--axi-brand)_42%,transparent),transparent_68%)]"
            />
            {aside}
          </aside>
          <div className="flex flex-col justify-center gap-6 p-6 sm:p-10 lg:p-12">
            <header className="space-y-2">
              {heading}
              {description ? <p className="text-muted-foreground text-sm text-pretty">{description}</p> : null}
            </header>
            {children}
            {footer ? <div className="text-muted-foreground space-y-2 text-sm">{footer}</div> : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-10 w-full space-y-6 px-4 pb-10 sm:mt-14 sm:px-0">
      <header className="space-y-3 text-center">
        <BrandMark className="mx-auto size-12" />
        {heading}
        {description ? <p className="text-muted-foreground mx-auto max-w-sm text-sm text-pretty">{description}</p> : null}
      </header>
      {children ? (
        <div className="border-border bg-card rounded-2xl border p-4 shadow-sm sm:p-6">{children}</div>
      ) : null}
      {footer ? <div className="text-muted-foreground space-y-2 text-center text-sm">{footer}</div> : null}
    </div>
  )
}
