"use client"

import * as React from "react"

/**
 * Locks the app scroll when `locked` is true.
 *
 * html/body llevan `overflow: hidden` global: el scroll real vive en los
 * contenedores de layout marcados con `data-app-scroll` (público y privado).
 * El lock congela el body (por si algún contexto scrollea ahí) Y el contenedor
 * activo. Respeta estilos inline previos y soporta locks anidados con un
 * contador de referencias.
 */
let lockCounter = 0
let previousBodyOverflow: string | null = null
let lockedContainer: HTMLElement | null = null
let previousContainerOverflow: string | null = null

export function useBodyScrollLock(locked: boolean, options?: { disabled?: boolean }) {
  const { disabled = false } = options ?? {}

  React.useEffect(() => {
    if (disabled) return
    if (!locked) return

    lockCounter += 1
    if (lockCounter === 1) {
      previousBodyOverflow = document.body.style.overflow || ""
      document.body.style.overflow = "hidden"
      // Prevent iOS rubber band scrolling side-effects
      document.body.style.touchAction = "none"

      lockedContainer = document.querySelector<HTMLElement>("[data-app-scroll]")
      if (lockedContainer) {
        previousContainerOverflow = lockedContainer.style.overflow || ""
        lockedContainer.style.overflow = "hidden"
      }
    }

    return () => {
      lockCounter = Math.max(0, lockCounter - 1)
      if (lockCounter === 0) {
        if (previousBodyOverflow !== null) document.body.style.overflow = previousBodyOverflow
        document.body.style.touchAction = ""
        previousBodyOverflow = null
        if (lockedContainer) {
          lockedContainer.style.overflow = previousContainerOverflow ?? ""
          lockedContainer = null
          previousContainerOverflow = null
        }
      }
    }
  }, [locked, disabled])
}