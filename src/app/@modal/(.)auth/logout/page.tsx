"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Modal from "@/shared/components/ui/modal"
import { useAuth } from "@/shared/auth/auth.hooks"

/**
 * Confirmación de «Cerrar sesión» (ruta interceptada sobre la página actual).
 *
 * Salir es una navegación DURA a `/`, no `router.replace`: vacía la caché del
 * router (que podía guardar este mismo modal en sus prefetch y reabrirlo al
 * volver a entrar) y los stores de la sesión que se cierra, para que la
 * siguiente cuenta no herede datos de la anterior (hotfix 22-nov-2026).
 */
export default function LogoutConfirmModal() {
  const router = useRouter()
  const { logout } = useAuth()
  const [leaving, setLeaving] = useState(false)
  const leavingRef = useRef(false)

  async function handleConfirm() {
    if (leavingRef.current) return
    leavingRef.current = true
    setLeaving(true)
    try {
      await logout()
    } catch {
      // Sin red no hubo cierre: el diálogo sigue ahí para reintentar.
      leavingRef.current = false
      setLeaving(false)
      return
    }
    window.location.replace("/")
  }

  // Un solo camino para cancelar (botón, X, Escape, clic fuera): el cierre del
  // diálogo. Mientras se sale, cerrar no vuelve atrás.
  function handleOpenChange(open: boolean) {
    if (open || leavingRef.current) return
    router.back()
  }

  return (
    <Modal
      open
      onOpenChange={handleOpenChange}
      config={{
        title: "Cerrar sesión",
        description: "¿Seguro que deseas cerrar la sesión?",
        actions: [
          { label: "Cancelar", variant: "outline", disabled: leaving },
          // keepOpen: si cerrara el diálogo, su `onOpenChange(false)` haría
          // además un `router.back()` en carrera con la salida.
          { label: "Cerrar sesión", variant: "destructive", keepOpen: true, disabled: leaving, onClick: handleConfirm },
        ],
      }}
    >
      <p className="text-sm text-foreground/70">Se cerrará tu sesión actual y volverás al inicio.</p>
    </Modal>
  )
}
