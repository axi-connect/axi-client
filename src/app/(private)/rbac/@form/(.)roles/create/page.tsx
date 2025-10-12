"use client"

import { useRouter } from "next/navigation"
import { Modal } from "@/components/ui/modal"
import { RoleForm } from "../../../../../../modules/rbac/ui/forms/RoleForm"

export default function RbacInterceptRolesCreate() {
  const router = useRouter()

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-role-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Crear rol",
        description: "Registra un nuevo rol del sistema",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "role-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "role-save" },
        ],
      }}
    >
      <RoleForm onSuccess={() => router.back()}/>
    </Modal>
  )
}