"use client"

import { Modal } from "@/shared/components/ui/modal"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ModuleForm } from "../../../../../../../modules/rbac/ui/forms/ModuleForm"
import { useOverview } from "../../../../../../../modules/rbac/infrastructure/overview.context"
import { getRbacOverview, getRbacOverviewRoleDetail } from "@/modules/rbac/infrastructure/overview-service.adapter"

export default function RbacInterceptModulesUpdate() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params?.id
  const { refreshModules } = useOverview()
  const [defaults, setDefaults] = useState<any | null>(null)

  useEffect(() => { refreshModules() }, [refreshModules])

  // TODO: Replace with module detail service when available
  useEffect(() => {
    let active = true
    ;(async () => {
      // If there is a module detail endpoint, call it here and map to form defaults
      // For now we just set id to allow update path usage if needed
      if (active) setDefaults({ id: Number(id) })
    })()
    return () => { active = false }
  }, [id])

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-module-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Actualizar módulo",
        description: `Edita el módulo #${id}`,
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "module-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "module-save" },
        ],
      }}
    >
      <ModuleForm
        host={{ defaultValues: defaults ?? undefined }}
        onSuccess={() => router.back()}
      />
    </Modal>
  )
}