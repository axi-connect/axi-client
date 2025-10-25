"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Modal from "@/shared/components/ui/modal"
import { useAuth } from "@/shared/auth/auth.hooks"

export default function LogoutConfirmModal() {
  const router = useRouter()
  const { logout } = useAuth()
  const [open, setOpen] = useState(true)

  async function handleConfirm() {
    await logout()
    setOpen(false)
    router.replace("/auth/login")
  }

  function handleCancel() {
    router.back()
  }

  return (
    <Modal
      open={open}
      onOpenChange={(open) => { if (!open) handleCancel() }}
      config={{
        title: "Cerrar sesión",
        description: "¿Seguro que deseas cerrar la sesión?",
        actions: [
          { label: "Cancelar", asClose: true, variant: "outline", onClick: handleCancel },
          { label: "Cerrar sesión", variant: "destructive", onClick: handleConfirm },
        ],
      }}
    >
      <p className="text-sm text-foreground/70">Se cerrará tu sesión actual y volverás al inicio de sesión.</p>
    </Modal>
  )
}