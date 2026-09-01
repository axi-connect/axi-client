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
  /**
   * La EXCEPCIÓN: esta acción no cierra el diálogo.
   *
   * Por defecto toda acción cierra, porque lo contrario era el defecto: una
   * confirmación se pulsaba, el trabajo se hacía, salía el aviso… y el diálogo
   * seguía ahí. Pasaba en trece sitios del panel —borrar leads, promover al CRM,
   * borrar una búsqueda, contactos, etiquetas, segmentos, embudos, reglas— y
   * cada uno lo tapaba a su manera o no lo tapaba.
   */
  keepOpen?: boolean
  /**
   * @deprecated Ya no hace nada: toda acción cierra salvo `keepOpen`. Se sigue
   * aceptando porque catorce llamadas lo pasan, y quitarlo sería tocar catorce
   * ficheros para no cambiar ninguna conducta.
   */
  asClose?: boolean
}

export type ModalConfig = {
  title?: string
  description?: string
  /**
   * Contenido extra bajo la descripción. Es OPCIONAL a propósito: la
   * consecuencia de la acción la escribe cada `description`, y un cuerpo fijo
   * en el proveedor contradecía la copia de la mitad de las confirmaciones
   * (ver `alert-provider.tsx`).
   */
  body?: React.ReactNode
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
  const { title, description, trigger, actions = [], className, showCloseButton = true, body } = config || {}

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

        {body}
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
              /*
                CIERRA POR DEFECTO, y va por `DialogClose` y no por un
                `onOpenChange(false)` a mano por dos razones: el `Slot` de Radix
                compone los dos manejadores —primero el del hijo, después el
                suyo—, así que el `onClick` se ejecuta igual; y funciona también
                en los `<Modal>` con `trigger` y sin `open`, que gestionan su
                estado por dentro y a los que un `onOpenChange` externo no
                cerraría.

                Cerrar antes de que un `onClick` asíncrono termine es lo
                correcto: el desenlace lo cuenta el aviso o el panel de
                resultado, y de paso desaparece el doble clic sobre un botón
                destructivo, que hoy sí es posible.
              */
              return a.keepOpen === true ? (
                btn
              ) : (
                <DialogClose asChild key={`${a.label}-${i}`}>
                  {btn}
                </DialogClose>
              )
            })}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default Modal