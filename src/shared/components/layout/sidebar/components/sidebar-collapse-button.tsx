"use client"

import { useEffect, useState } from "react"
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react"

import { cn } from "@/core/lib/utils"
import { useSidebar } from "@/shared/components/layout/sidebar/core"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

/**
 * `⌘B` en Mac, `Ctrl+B` en el resto — el atajo de `core.tsx` acepta ambos
 * modificadores, pero mostrar el que no es induce a error.
 *
 * Se resuelve tras el montaje porque `navigator` no existe en el servidor. No
 * afecta al primer paint: el contenido del tooltip lo monta Radix solo al
 * abrirlo, así que nunca viaja en el HTML del servidor.
 */
function useShortcutLabel() {
  const [isMac, setIsMac] = useState(false)
  useEffect(() => {
    setIsMac(/mac|iphone|ipad/i.test(navigator.userAgent))
  }, [])
  return isMac ? "⌘B" : "Ctrl+B"
}

/**
 * Control de colapso del sidebar, en su cabecera: el modo icono existía desde
 * el principio (`<Sidebar collapsible="icon">`) pero sólo se podía activar
 * desde un botón sin etiqueta del header de página, desde el atajo de teclado
 * o desde la franja de 4px del `SidebarRail`. Ninguna de las tres se ve.
 *
 * El icono y la etiqueta CAMBIAN con el estado: un control de plegado que se
 * pinta igual abierto que cerrado no dice en qué estado está ni qué va a hacer.
 *
 * En móvil el sidebar es un `Sheet` y su botón de cierre está oculto
 * (`[&>button]:hidden` en `core.tsx`), así que ahí este mismo botón es el
 * cierre — no hay "colapsar" que ofrecer sobre un panel a pantalla completa.
 *
 * No lleva `aria-expanded`: no hay un id sobre la región del sidebar al que
 * apuntar con `aria-controls`, y un `aria-expanded` huérfano es ambiguo. El
 * `aria-label`, que sí cambia con el estado, dice exactamente qué va a pasar.
 */
export function SidebarCollapseButton({ className }: { className?: string }) {
  const { state, isMobile, toggleSidebar } = useSidebar()
  const shortcut = useShortcutLabel()

  const collapsed = state === "collapsed" && !isMobile
  const Icon = isMobile ? X : collapsed ? PanelLeftOpen : PanelLeftClose
  const label = isMobile ? "Cerrar menú" : collapsed ? "Expandir menú" : "Colapsar menú"

  const button = (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={label}
      className={cn(
        "grid size-7 shrink-0 cursor-pointer place-items-center rounded-md",
        "text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </button>
  )

  // En el sheet móvil un tooltip no aporta (no hay hover) y taparía el menú.
  if (isMobile) return button

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      {/* Colapsado el sidebar mide 48px: a la derecha es el único lado con
          sitio, y es el mismo que usan los tooltips de las filas hoja. */}
      <TooltipContent side={collapsed ? "right" : "bottom"} sideOffset={6}>
        {label}
        <span className="ml-2 text-muted-foreground">{shortcut}</span>
      </TooltipContent>
    </Tooltip>
  )
}
