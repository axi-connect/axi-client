"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import * as Dialog from "@radix-ui/react-dialog"
import { useBodyScrollLock } from "./hooks/useBodyScrollLock"
import { useResponsiveSide } from "./hooks/useResponsiveSide"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import "./styles.css"

export type DetailSheetSize = "xs" | "sm" | "md" | "lg" | "xl" | number

export interface DetailSheetProps<Id extends string | number = string | number> {
  open: boolean
  onOpenChange: (open: boolean) => void
  id?: Id
  title?: React.ReactNode
  subtitle?: React.ReactNode
  side?: "auto" | "left" | "right" | "bottom"
  responsiveBreakpoint?: number
  size?: DetailSheetSize
  closeOnOverlayClick?: boolean
  closeOnEsc?: boolean
  disableScrollLock?: boolean
  portalTarget?: Element | string | null
  initialFocusRef?: React.RefObject<HTMLElement>
  className?: string
  children?: React.ReactNode
  renderHeader?: () => React.ReactNode
  renderFooter?: () => React.ReactNode
  fetchDetail?: (id: Id) => Promise<any>
  skeleton?: React.ReactNode
}

const WIDTH_MAP: Record<Exclude<DetailSheetSize, number>, number> = {
  xs: 320,
  sm: 380,
  md: 420,
  lg: 520,
  xl: 640,
}

function resolvePortalTarget(target: DetailSheetProps["portalTarget"]) {
  if (!target) return undefined
  if (typeof target === "string") return document.querySelector(target) || undefined
  return target
}

export default function DetailSheet<Id extends string | number = string | number>(props: DetailSheetProps<Id>) {
  const {
    open,
    onOpenChange,
    id,
    title,
    subtitle,
    side = "auto",
    responsiveBreakpoint = 768,
    size = 420,
    closeOnOverlayClick = true,
    closeOnEsc = true,
    disableScrollLock = false,
    portalTarget = null,
    initialFocusRef,
    className,
    children,
    renderHeader,
    renderFooter,
    fetchDetail,
    skeleton,
  } = props

  const prefersReducedMotion = useReducedMotion()
  const { side: resolvedSide, mounted } = useResponsiveSide({ side, breakpoint: responsiveBreakpoint })
  useBodyScrollLock(open, { disabled: disableScrollLock })

  const [ready, setReady] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const requestRef = React.useRef(0)

  React.useEffect(() => {
    if (!open) return
    let timeout: NodeJS.Timeout
    timeout = setTimeout(() => setReady(true), 50)
    if (!fetchDetail || id === undefined || id === null) return
    let cancelled = false
    const current = ++requestRef.current
    setLoading(true)
    
    fetchDetail(id)
      .catch(() => {})
      .finally(() => {
        if (cancelled) return
        // Only resolve if this is the latest request
        if (current === requestRef.current) setLoading(false)
      })
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [open, id, fetchDetail])

  const widthPx = typeof size === "number" ? size : WIDTH_MAP[size]
  const desktopStyle: React.CSSProperties = { width: `${widthPx}px` }
  const mobileHeight = "min(85vh, 760px)"

  const containerClass = cn(
    "axi-detail-sheet bg-background text-foreground",
    resolvedSide === "left"
      ? "inset-y-0 left-0 h-full"
      : resolvedSide === "right"
      ? "inset-y-0 right-0 h-full"
      : "inset-x-0 bottom-0",
    "fixed z-[60] flex flex-col border-border",
    resolvedSide === "left" ? "border-r" : resolvedSide === "right" ? "border-l" : "rounded-t-xl border-t",
    className,
  )

  const motionVariants =
    resolvedSide === "left"
      ? { hidden: { x: "-100%" }, visible: { x: 0 }, exit: { x: "-100%" } }
      : resolvedSide === "right"
      ? { hidden: { x: "100%" }, visible: { x: 0 }, exit: { x: "100%" } }
      : { hidden: { y: "100%" }, visible: { y: 0 }, exit: { y: "100%" } }

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 340, damping: 34 }

  const containerRef = React.useRef<HTMLDivElement | null>(null)

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: any) => {
    if (resolvedSide !== "bottom") return
    const dragOffsetY = info.offset?.y ?? 0
    const velocityY = info.velocity?.y ?? 0
    const thresholdOffset = 120
    const thresholdVelocity = 800
    if (dragOffsetY > thresholdOffset || velocityY > thresholdVelocity) {
      onOpenChange(false)
    }
  }

  const resolvedContainer = mounted ? resolvePortalTarget(portalTarget) : undefined

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={resolvedContainer}>
        <AnimatePresence>
          {open && ready && (
            <React.Fragment>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="axi-detail-sheet__backdrop fixed inset-0 z-[59]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-hidden="true"
                />
              </Dialog.Overlay>

              <Dialog.Content
                onEscapeKeyDown={(e) => {
                  if (!closeOnEsc) e.preventDefault()
                }}
                onInteractOutside={(e) => {
                  if (!closeOnOverlayClick) e.preventDefault()
                }}
                onOpenAutoFocus={(e) => {
                  if (initialFocusRef?.current) {
                    e.preventDefault()
                    initialFocusRef.current.focus()
                  }
                }}
                asChild
                forceMount
              >
                <motion.div
                  ref={containerRef}
                  role="dialog"
                  aria-modal="true"
                  className={containerClass}
                  style={resolvedSide === "left" || resolvedSide === "right" ? desktopStyle : { height: mobileHeight }}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  variants={motionVariants}
                  transition={transition}
                  drag={resolvedSide === "bottom" ? "y" : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.08}
                  onDragEnd={onDragEnd}
                >
                  {/* Handle visual for mobile */}
                  {resolvedSide === "bottom" ? (
                    <div className="flex items-center justify-center pt-2">
                      <div className="axi-detail-sheet__handle" />
                    </div>
                  ) : null}

                  {/* Header */}
                  <div className={cn("flex items-start gap-3 p-4 border-b border-border")}> 
                    <div className="min-w-0 flex-1">
                      {title ? (
                        <Dialog.Title asChild>
                          <h3 className="text-foreground font-semibold truncate">{title}</h3>
                        </Dialog.Title>
                      ) : (
                        <Dialog.Title className="sr-only">Detalle</Dialog.Title>
                      )}
                      {subtitle ? (
                        <Dialog.Description asChild>
                          <p className="text-muted-foreground text-sm truncate">{subtitle}</p>
                        </Dialog.Description>
                      ) : (
                        <Dialog.Description className="sr-only">Panel de detalle</Dialog.Description>
                      )}
                    </div>
                    <Dialog.Close asChild>
                      <button
                        aria-label="Cerrar"
                        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-secondary text-foreground/80"
                      >
                        ✕
                      </button>
                    </Dialog.Close>
                  </div>

                  {renderHeader ? renderHeader() : null}

                  {/* Body */}
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    {loading && skeleton ? skeleton : children}
                  </div>

                  {/* Footer slot */}
                  {renderFooter ? (
                    <div className="border-t border-border p-4">{renderFooter()}</div>
                  ) : null}
                </motion.div>
              </Dialog.Content>
            </React.Fragment>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}