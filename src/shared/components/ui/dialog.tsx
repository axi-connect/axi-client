"use client"

import * as React from "react";
import { cn } from "@/core/lib/utils";
import { XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";

/**
 * Si el diálogo está abierto. Radix no lo expone, y `DialogContent` lo necesita
 * para montar su contenido con `forceMount` DENTRO de `AnimatePresence`: así la
 * salida se anima antes de desmontar (QA H3-2). `null` = fuera de `Dialog`.
 */
const DialogOpenContext = React.createContext<boolean | null>(null)

/**
 * El último elemento que recibió el foco FUERA de un diálogo: a él vuelve el
 * foco al cerrar. Un solo oyente para toda la app, en fase de captura para
 * verlo antes de que un FocusScope lo mueva.
 */
let lastFocusOutsideDialogs: HTMLElement | null = null
let trackerInstalled = false

function ensureFocusTracker(): void {
  if (trackerInstalled || typeof document === "undefined") return
  trackerInstalled = true
  if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
    lastFocusOutsideDialogs = document.activeElement
  }
  document.addEventListener(
    "focusin",
    (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.closest('[data-slot="dialog-content"], [role="dialog"], [role="alertdialog"]')) return
      lastFocusOutsideDialogs = target
    },
    true,
  )
}

/**
 * Raíz del diálogo. Siempre controla el `open` de Radix (el suyo o uno propio
 * si el llamador no lo pasa) para que el contenido sepa cuándo animar la salida.
 */
function Dialog({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const [innerOpen, setInnerOpen] = React.useState(defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : innerOpen
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!controlled) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root data-slot="dialog" open={open} onOpenChange={handleOpenChange} {...props} />
    </DialogOpenContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  // El `motion.div` es el hijo DIRECTO del `asChild`: el Slot le pasa sus props.
  return (
    <DialogPrimitive.Overlay asChild {...props}>
      <motion.div
        data-slot="dialog-overlay"
        className={cn(
          "fixed inset-0 z-50 backdrop-blur-sm sm:backdrop-blur-md bg-background/40 dark:bg-background/30",
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
    </DialogPrimitive.Overlay>
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const open = React.useContext(DialogOpenContext)
  /*
    Al cerrar, el foco vuelve a quien abrió el diálogo (QA H3-2). Radix solo lo
    devuelve a un `DialogTrigger`, y casi todos los diálogos del panel se abren
    controlados (desde un menú, un botón con estado). Capturar
    `document.activeElement` en un efecto del contenido NO sirve: en modo
    estricto el efecto corre dos veces y la segunda ya ve el foco DENTRO del
    diálogo. Por eso el disparador es el último elemento enfocado FUERA de
    cualquier diálogo (`lastFocusOutsideDialogs`), fijado al abrir.
  */
  const returnFocusRef = React.useRef<HTMLElement | null>(null)
  React.useLayoutEffect(() => {
    ensureFocusTracker()
    if (open !== false) returnFocusRef.current = lastFocusOutsideDialogs
  }, [open])

  const handleCloseAutoFocus = (event: Event) => {
    onCloseAutoFocus?.(event)
    if (event.defaultPrevented) return
    const target = returnFocusRef.current
    // Si el disparador ya no existe (un ítem de menú), Radix hace lo suyo.
    if (target && target.isConnected && target !== document.body) {
      event.preventDefault()
      target.focus()
    }
  }

  const content = (
    <DialogPrimitive.Content
      asChild
      forceMount={open === null ? undefined : true}
      onInteractOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
      onCloseAutoFocus={handleCloseAutoFocus}
      {...props}
    >
      {/*
        El hijo DIRECTO de `Content asChild` tiene que ser el elemento del DOM:
        el `Slot` de Radix le pasa `role="dialog"`, `aria-labelledby` y la ref del
        foco (QA H2-11).
      */}
          <motion.div
            data-slot="dialog-content"
            aria-modal="true"
            className={cn(
              "glass-overlay bg-background fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border p-8 sm:max-w-lg max-h-[calc(100vh-3rem)] overflow-y-auto overscroll-contain touch-pan-y sidebar-scroll",
              className
            )}
            onWheelCapture={(e: React.WheelEvent<HTMLDivElement>) => e.stopPropagation()}
            onTouchMoveCapture={(e: React.TouchEvent<HTMLDivElement>) => e.stopPropagation()}
            initial={{ y: 250, scale: 0.94 }}
            animate={{ y: 0, scale: 1, opacity: 1, transition: { type: "spring", stiffness: 380, damping: 28, mass: 0.9 } }}
            exit={{ y: 30, scale: 0.98, opacity: 0, transition: { duration: 0.18, ease: "easeInOut" } }}
          >
            {children}
            {showCloseButton && (
              <DialogPrimitive.Close
                data-slot="dialog-close"
                className="cursor-pointer ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
              >
                <XIcon />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}
          </motion.div>
    </DialogPrimitive.Content>
  )

  // Fuera de `Dialog` (sin estado conocido) no hay salida animada.
  if (open === null) {
    return (
      <DialogPortal data-slot="dialog-portal">
        <DialogOverlay />
        {content}
      </DialogPortal>
    )
  }

  // `AnimatePresence` FUERA del Content y `forceMount`: Radix no desmonta al
  // cerrar, lo hace `AnimatePresence` cuando termina la salida (QA H3-2).
  return (
    <DialogPortal data-slot="dialog-portal" forceMount>
      <AnimatePresence>
        {open ? (
          <React.Fragment key="dialog">
            <DialogOverlay forceMount />
            {content}
          </React.Fragment>
        ) : null}
      </AnimatePresence>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}