"use client"

import * as React from "react"

/**
 * Locks document.body scroll when `locked` is true.
 * Respects existing inline overflow styles and restores them on cleanup.
 * Handles nested locks using a simple reference counter.
*/
let lockCounter = 0
let previousOverflow: string | null = null

export function useBodyScrollLock(locked: boolean, options?: { disabled?: boolean }) {
  const { disabled = false } = options ?? {}

  React.useEffect(() => {
    if (disabled) return
    if (!locked) return

    lockCounter += 1
    if (lockCounter === 1) {
      previousOverflow = document.body.style.overflow || ""
      document.body.style.overflow = "hidden"
      // Prevent iOS rubber band scrolling side-effects
      document.body.style.touchAction = "none"
    }

    return () => {
      lockCounter = Math.max(0, lockCounter - 1)
      if (lockCounter === 0) {
        if (previousOverflow !== null) document.body.style.overflow = previousOverflow
        document.body.style.touchAction = ""
        previousOverflow = null
      }
    }
  }, [locked, disabled])
}