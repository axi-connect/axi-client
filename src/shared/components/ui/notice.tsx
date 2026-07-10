"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"
import { spring } from "@/core/styles/motion"
import {
  AlertCircle,
  CheckCircle2,
  Info,
  TriangleAlert,
  X as XIcon,
} from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Button } from "@/shared/components/ui/button"

const container = cva(
  "absolute fixed top-4 left-0 right-0 mx-auto z-[9999] h-fit w-2xl rounded-2xl border p-4 pr-10 shadow-sm glass backdrop-blur-md",
  {
    variants: {
      tone: {
        neutral:
          "bg-background/70 border-border-soft",
        success:
          "bg-success/8 border-success/25 dark:bg-success/10 dark:border-success/30",
        warning:
          "bg-warning/8 border-warning/25 dark:bg-warning/10 dark:border-warning/30",
        error:
          "bg-destructive/8 border-destructive/25 dark:bg-destructive/10 dark:border-destructive/30",
        info:
          "bg-info/8 border-info/25 dark:bg-info/10 dark:border-info/30",
      },
      elevated: { true: "shadow-lg", false: "shadow-none" },
    },
    defaultVariants: { tone: "neutral", elevated: true },
  }
)

const titleStyles = cva(
  "text-base font-semibold tracking-tight text-foreground",
  { variants: { compact: { true: "", false: "mb-1" } }, defaultVariants: { compact: false } }
)

const descStyles = "text-muted-foreground text-sm leading-relaxed"

type Tone = "neutral" | "success" | "warning" | "error" | "info"

export type StatusAction = {
  id?: string
  label: React.ReactNode
  onClick?: () => void
  variant?: React.ComponentProps<typeof Button>["variant"]
}

export type StatusAlertProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  tone?: Tone
  title: React.ReactNode
  description?: React.ReactNode
  actions?: StatusAction[]
  dismissible?: boolean
  autoCloseMs?: number
  className?: string
  compact?: boolean
  elevated?: boolean
}

const toneToIcon: Record<Tone, React.ComponentType<{ className?: string }>> = {
  neutral: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: AlertCircle,
  info: Info,
}

export function StatusAlert(props: StatusAlertProps) {
  const {
    defaultOpen,
    open: controlledOpen,
    onOpenChange,
    tone = "neutral",
    title,
    description,
    actions,
    dismissible = true,
    autoCloseMs,
    className,
    compact,
    elevated,
  } = props

  const [uncontrolledOpen, setUncontrolledOpen] = React.useState<boolean>(
    defaultOpen ?? true
  )
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? !!controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [isControlled, onOpenChange]
  )

  React.useEffect(() => {
    if (!open) return
    if (!autoCloseMs) return
    const delay = Math.max(1000, autoCloseMs)
    const id = setTimeout(() => setOpen(false), delay)
    return () => clearTimeout(id)
  }, [open, autoCloseMs, setOpen])

  const Icon = toneToIcon[tone]

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          role="alert"
          aria-live={tone === "error" ? "assertive" : "polite"}
          className={cn(container({ tone, elevated }), "grid grid-cols-[auto_1fr] gap-3 items-center", className)}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={spring.snappy}
        >
          <span
            aria-hidden
            className={cn(
              "grid place-items-center size-10 rounded-full shadow-sm",
              tone === "error" && "bg-destructive/10 text-destructive dark:bg-destructive/15",
              tone === "warning" && "bg-warning/10 text-warning dark:bg-warning/15",
              tone === "success" && "bg-success/10 text-success dark:bg-success/15",
              tone === "info" && "bg-info/10 text-info dark:bg-info/15",
              tone === "neutral" && "bg-muted text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
          </span>

          <div className="grid gap-1">
            <div className={titleStyles({ compact })}>{title}</div>
            {description ? (
              <div className={descStyles}>{description}</div>
            ) : null}
            {actions && actions.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {actions.map((action, idx) => (
                  <Button
                    key={action.id ?? idx}
                    size="sm"
                    variant={action.variant ?? (idx === 0 ? "default" : "outline")}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          {dismissible ? (
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setOpen(false)}
              className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export type { Tone as StatusAlertTone }

/**
 * Usage:
 *
 * <StatusAlert
 *   tone="success"
 *   title="This is success message"
 *   description="Supporting description text"
 *   actions={[{ label: "Action", onClick: () => {} }]}
 *   autoCloseMs={4000}
 * />
*/