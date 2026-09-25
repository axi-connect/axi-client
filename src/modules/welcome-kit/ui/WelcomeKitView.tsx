"use client"

import { useEffect, useRef, useState } from "react"

import type { KitView } from "../domain/kit-view"
import { KitSvgDefs } from "./illustrations/KitIllustrations"
import { KitAgent } from "./sections/KitAgent"
import { KitContact } from "./sections/KitContact"
import { KitCover } from "./sections/KitCover"
import { KitPanel } from "./sections/KitPanel"
import { KitPlan } from "./sections/KitPlan"
import { KitWeek } from "./sections/KitWeek"
import { KitWelcome } from "./sections/KitWelcome"
import s from "./welcome-kit.module.css"

/**
 * El kit de bienvenida: la portada y seis secciones, fiel al paquete de diseño.
 *
 * Es componente de cliente solo por el ancho: la portada escala su escenario
 * de 900 px y el contacto recoloca el WhatsApp según el ancho REAL del kit, que
 * mide un ResizeObserver (el mismo `renderVals()` del template de referencia).
 * Antes de medir, `width` es null y la portada no pinta el escenario.
 */
export function WelcomeKitView({ view }: { view: KitView }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    setWidth(Math.round(el.getBoundingClientRect().width))
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className={s.kit}>
      <KitSvgDefs className={s.defs} />
      <KitCover view={view} width={width} />
      <KitWelcome view={view} />
      <KitAgent view={view} />
      <KitPanel view={view} />
      <KitWeek view={view} />
      <KitPlan view={view} />
      <KitContact view={view} width={width} />
    </div>
  )
}
