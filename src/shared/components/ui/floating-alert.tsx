"use client"

import { cn } from "@/core/lib/utils";
import { XIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

export type FloatingAlertConfig = {
  id?: string
  variant?: "default" | "destructive" | "success"
  title: React.ReactNode
  description?: React.ReactNode
  durationMs?: number
  showClose?: boolean
  persistent?: boolean
  className?: string
  position?: {
    top?: number
    right?: number
  }
}

type FloatingAlertProps = {
  open: boolean
  onOpenChange?: (open: boolean) => void
  config: FloatingAlertConfig
}

export function FloatingAlert({ open, onOpenChange, config }: FloatingAlertProps) {
  const {
    variant = "default",
    title,
    description,
    durationMs = 4000,
    showClose = true,
    persistent = false,
    className,
    position,
  } = config

  useEffect(() => {
    if (!open) return
    if (variant === "destructive" || persistent) return
    const t = setTimeout(() => onOpenChange?.(false), Math.max(1000, durationMs))
    return () => clearTimeout(t)
  }, [open, persistent, durationMs, onOpenChange])

  const top = position?.top ?? 50
  const right = position?.right ?? 24

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          exit={{ opacity: 0, top: -100 }}
          animate={{ opacity: 1, top: top }}
          initial={{ opacity: 0, top: -100 }}
          key={config.id ?? "floating-alert"}
          transition={{ type: "spring", stiffness: 300, damping: 26, mass: 0.6 }}
          style={{ position: "fixed", top, right, zIndex: 9999 }}
        >
          <Alert variant={variant} className={cn("glass shadow-lg w-[min(92vw,28rem)] pr-9", className)}>
            {showClose ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Cerrar alerta"
                onClick={() => onOpenChange?.(false)}
                className="absolute right-1 top-1.5 h-7 w-7"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            ) : null}
            <AlertTitle>{title}</AlertTitle>
            {description ? <AlertDescription>{description}</AlertDescription> : null}
          </Alert>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}