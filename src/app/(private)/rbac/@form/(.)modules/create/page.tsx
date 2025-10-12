"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"
import { ModuleForm } from "@/modules/rbac/ui/forms/ModuleForm"
import { useOverview } from "@/modules/rbac/infrastructure/overview.context"

export default function RbacInterceptModulesCreate() {
  const router = useRouter()
  const { refreshModules } = useOverview()

  useEffect(() => { refreshModules() }, [refreshModules])

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-module-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear módulo",
        description: "Registra un nuevo módulo y su jerarquía",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "module-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "module-save" },
        ],
      }}
    >
      <ModuleForm onSuccess={() => router.back()} />
    </Modal>
  )
}