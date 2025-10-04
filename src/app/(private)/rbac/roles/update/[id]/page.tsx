"use client"

import { useEffect, useState } from "react"
import { Modal } from "@/components/ui/modal"
import Loader from "@/components/layout/loader"
import { useParams, useRouter } from "next/navigation"
import { RoleForm } from "@/app/(private)/rbac/roles/form/RoleForm"
import { getRbacOverviewRoleDetail } from "@/app/(private)/rbac/service"
import { useOverview } from "@/app/(private)/rbac/context/overview.context"

export default function RbacInterceptRolesUpdate() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = Number(params.id)
  const { refreshModules } = useOverview()
  const [defaults, setDefaults] = useState<any | null>(null)

  useEffect(() => { refreshModules() }, [refreshModules])
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await getRbacOverviewRoleDetail(id)
        const role = data.roles?.[0]
        if (!mounted) return
        const mapped = role ? {
          id: role.id,
          name: role.name,
          description: role.description ?? "",
          status: (role as any).state ?? (role as any).status ?? "active",
          hierarchy_level: (role as any).hierarchy_level ?? 0,
          permissions: role.modules ? role.modules.map((m: any) => ({ module_id: m.id, permission: m.permissions })) : [],
        } : null
        setDefaults(mapped)
      } catch {
        setDefaults(null)
      }
    })()
    return () => { mounted = false }
  }, [id])

  const onModalSubmitClick = () => {
    const form = document.getElementById("rbac-role-form") as HTMLFormElement | null
    form?.requestSubmit()
  }

  return (
    // <>
    <Modal
      open={true}
      onOpenChange={(open) => { if (!open) router.back() }}
      config={{
        title: "Actualizar rol",
        description: "Modifica los datos del rol",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "role-cancel" },
          { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "role-save" },
        ],
      }}
    >
      {defaults ? (
        <RoleForm host={{ defaultValues: defaults }} onSuccess={() => router.back()} />
      ): (
        <Loader />
      )}
    </Modal>
    // </>
  )
}