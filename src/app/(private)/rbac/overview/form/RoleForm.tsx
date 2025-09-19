"use client"

import { parseHttpError } from "@/shared/api"
import { useEffect, useMemo, useState } from "react"
import type { RbacModuleSummaryDTO } from "../../model"
import { DynamicForm } from "@/components/dynamic-form"
import { listRbacModulesSummary, createRbacRole, updateRbacRole } from "../../service"
import { roleFormSchema, buildRoleFormFields, defaultRoleFormValues, toCreateRoleDTO, type RoleFormValues } from "./form.config"

export type RoleFormHost = {
  closeModal?: () => void
  refresh?: () => Promise<void> | void
  defaultValues?: Partial<RoleFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function RoleForm({ host, onSuccess }: { host?: RoleFormHost; onSuccess?: () => void }) {
  const [modules, setModules] = useState<RbacModuleSummaryDTO[]>([])

  useEffect(() => {
    listRbacModulesSummary().then(({ data }) => setModules(data.modules)).catch(() => setModules([]))
  }, [])

  const fields = useMemo(() => buildRoleFormFields(modules), [modules])

  async function handleSubmit(values: RoleFormValues) {
    try {
      const payload = toCreateRoleDTO(values)
      const id = (host?.defaultValues as any)?.id
      const res = id ? await updateRbacRole(id, payload) : await createRbacRole(payload)
      if (res?.successful) {
        host?.setAlert?.({ variant: "success", title: res.message || (id ? "Rol actualizado correctamente" : "Rol creado correctamente") })
        await host?.refresh?.()
        host?.closeModal?.()
        onSuccess?.()
      } else {
        host?.setAlert?.({ variant: "destructive", title: res?.message || (id ? "No se pudo actualizar el rol" : "No se pudo crear el rol") })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      host?.setAlert?.({ variant: "destructive", title: message || ((host?.defaultValues as any)?.id ? "No se pudo actualizar el rol" : "No se pudo crear el rol"), description: status ? `Código: ${status}` : undefined })
    }
  }

  return (
    <DynamicForm<RoleFormValues>
      gap={4}
      fields={fields}
      id="rbac-role-form"
      schema={roleFormSchema}
      onSubmit={handleSubmit}
      columns={{ base: 1, md: 2 }}
      defaultValues={{ ...defaultRoleFormValues, ...(host?.defaultValues ?? {}) }}
    />
  )
}