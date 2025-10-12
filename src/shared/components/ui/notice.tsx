"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AnimatePresence, motion } from "framer-motion"
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
  "absolute fixed top-4 left-0 right-0 mx-auto z-50 h-fit w-2xl rounded-2xl border p-4 pr-10 shadow-sm glass backdrop-blur-md",
  {
    variants: {
      tone: {
        neutral:
          "bg-white/70 dark:bg-neutral-900/40 border-black/10 dark:border-white/10",
        success:
          "bg-emerald-50/70 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-400/30",
        warning:
          "bg-amber-50/70 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-400/30",
        error:
          "bg-rose-50/70 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-400/30",
        info:
          "bg-sky-50/70 dark:bg-sky-500/10 border-sky-200/60 dark:border-sky-400/30",
      },
      elevated: { true: "shadow-lg", false: "shadow-none" },
    },
    defaultVariants: { tone: "neutral", elevated: true },
  }
)

const titleStyles = cva(
  "text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100",
  { variants: { compact: { true: "", false: "mb-1" } }, defaultVariants: { compact: false } }
)

const descStyles = "text-slate-600/90 dark:text-slate-300/80 text-sm leading-relaxed"

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
          transition={{ type: "spring", stiffness: 380, damping: 28, mass: 0.7 }}
        >
          <span
            aria-hidden
            className={cn(
              "grid place-items-center size-10 rounded-full shadow-sm",
              tone === "error" && "bg-rose-100/80 text-rose-600 dark:bg-rose-400/15 dark:text-rose-300",
              tone === "warning" && "bg-amber-100/80 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300",
              tone === "success" && "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300",
              tone === "info" && "bg-sky-100/80 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
              tone === "neutral" && "bg-slate-100/80 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
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
              className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-black/5 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:text-slate-400 dark:hover:bg-white/5"
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