"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Toaster } from "sileo"

/**
 * El viewport de los avisos (DESIGN-SYSTEM §9.4). Lo monta `AlertProvider` una
 * sola vez, en el layout raíz: panel, `/platform`, `/configurar` y `/comenzar`.
 *
 * - Arriba al centro; el `padding` de .75rem del viewport de sileo ya deja la
 *   píldora a 12 px del borde, dentro del header de 54 px: `offset.top = 0`.
 * - `theme` sigue a next-themes. En sileo `"light"` significa píldora OSCURA:
 *   es la tinta invertida aprobada (tipo Dynamic Island). El color real no sale
 *   de aquí sino de `--toast-fill` en `globals.css`, que gana al atributo `fill`
 *   del SVG y conmuta con `.dark` aunque haya avisos abiertos.
 * - Se monta tras la hidratación: `resolvedTheme` no existe en el servidor y
 *   el viewport vacío no tiene nada que pintar antes.
 */
export function NotificationsToaster() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <Toaster
      position="top-center"
      offset={{ top: 0 }}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      options={{
        roundness: 16,
        styles: { title: "axi-toast-title", description: "axi-toast-description", button: "axi-toast-button" },
      }}
    />
  )
}
