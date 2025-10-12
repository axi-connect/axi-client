"use client"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"

export type ModalAction = {
  id?: string
  label: string
  onClick?: () => void
  variant?: "default" | "outline" | "destructive" | "secondary"
  asClose?: boolean
}

export type ModalConfig = {
  title?: string
  description?: string
  trigger?: React.ReactNode
  actions?: ModalAction[]
  className?: string
  showCloseButton?: boolean
}

type ModalProps = React.PropsWithChildren<{
  open?: boolean
  onOpenChange?: (open: boolean) => void
  config?: ModalConfig
}>

export function Modal({ open, onOpenChange, config, children }: ModalProps) {
  const { title, description, trigger, actions = [], className, showCloseButton = true } = config || {}

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={className} showCloseButton={showCloseButton}>
        {(title || description) && (
          <DialogHeader>
            {title ? <DialogTitle>{title}</DialogTitle> : null}
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
        )}

        {children}

        {actions.length > 0 && (
          <DialogFooter>
            {actions.map((a, i) => {
              const key = a.id || `${a.label}-${i}`
              const btn = (
                <Button
                  id={key}
                  key={key}
                  size="sm"
                  type="button"
                  onClick={a.onClick}
                  variant={a.variant}
                >
                  {a.label}
                </Button>
              )
              return a.asClose ? (
                <DialogClose asChild key={`${a.label}-${i}`}>
                  {btn}
                </DialogClose>
              ) : (
                btn
              )
            })}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default Modal