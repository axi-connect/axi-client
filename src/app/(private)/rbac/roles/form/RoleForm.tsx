"use client"

import { useMemo } from "react"
import { parseHttpError } from "@/shared/api"
import { useOverview } from "../../context/overview.context"
import { DynamicForm } from "@/components/features/dynamic-form"
import { useAlert } from "@/components/providers/alert-provider"
import { createRbacRole, updateRbacRole } from "@/app/(private)/rbac/service"
import { roleFormSchema, buildRoleFormFields, defaultRoleFormValues, toCreateRoleDTO, type RoleFormValues } from "./form.config"

export type RoleFormHost = {
  defaultValues?: Partial<RoleFormValues>
}

export function RoleForm({ host, onSuccess }: { host?: RoleFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()
  const { modules, refreshOverview } = useOverview()
  const fields = useMemo(() => buildRoleFormFields(modules), [modules])

  async function handleSubmit(values: RoleFormValues) {
    try {
      const payload = toCreateRoleDTO(values)
      const id = (host?.defaultValues as any)?.id
      const res = id ? await updateRbacRole(id, payload) : await createRbacRole(payload)
      if (res?.successful) {
        showAlert({ tone: "success", title: res.message || (id ? "Rol actualizado correctamente" : "Rol creado correctamente"), autoCloseMs: 3000 })
        await refreshOverview()
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res?.message || (id ? "No se pudo actualizar el rol" : "No se pudo crear el rol") })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || ((host?.defaultValues as any)?.id ? "No se pudo actualizar el rol" : "No se pudo crear el rol"), description: status ? `Código: ${status}` : undefined })
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
      defaultValues={{ ...defaultRoleFormValues, ...(host?.defaultValues) }}
    />
  )
}