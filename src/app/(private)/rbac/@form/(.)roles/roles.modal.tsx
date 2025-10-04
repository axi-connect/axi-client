"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"
import { RoleForm } from "@/app/(private)/rbac/roles/form/RoleForm"
import { useOverview } from "@/app/(private)/rbac/context/overview.context"

export default function RbacInterceptRolesModal() {
  const router = useRouter()
  const { refreshModules, selectedRole } = useOverview()
  useEffect(() => { refreshModules() }, [refreshModules])

  const modalTexts = {
    edit: {
      title: "Actualizar rol",
      description: "Modifica los datos del rol",
    },
    create: {
      title: "Crear rol",
      description: "Define permisos y jerarquía para el nuevo rol",
    },
  }

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-role-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: modalTexts[selectedRole ? "edit" : "create"].title,
        description: modalTexts[selectedRole ? "edit" : "create"].description,
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "role-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "role-save" },
        ],
      }}
    >
      <RoleForm host={{ defaultValues: selectedRole }} onSuccess={() => router.back()} />
    </Modal>
  )
}