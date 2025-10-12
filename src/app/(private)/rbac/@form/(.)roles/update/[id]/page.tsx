"use client"

import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import { useParams, useRouter } from "next/navigation"
import { useOverview } from "../../../../../../../modules/rbac/infrastructure/overview.context"
import { RoleForm } from "../../../../../../../modules/rbac/ui/forms/RoleForm"

export default function RbacInterceptRolesUpdate() {
  const router = useRouter()
  const { selectedRole } = useOverview()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const [defaults, setDefaults] = useState<any | null>(null)

  useEffect(() => {
    if (selectedRole) setDefaults(selectedRole)
  }, [selectedRole])

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-role-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Actualizar rol",
        description: `Edita el rol #${id}`,
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "role-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "role-save" },
        ],
      }}
    >
      <RoleForm
        host={{ defaultValues: defaults ?? undefined }}
        onSuccess={() => router.back()}
      />
    </Modal>
  )
}