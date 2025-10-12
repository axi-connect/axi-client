"use client"

import { useMemo } from "react"
import { parseHttpError } from "@/shared/api"
import { DynamicForm } from "@/components/features/dynamic-form"
import { useAlert } from "@/components/providers/alert-provider"
import { useOverview } from "../../infrastructure/overview.context"
import { createRbacRole, updateRbacRole } from "../../infrastructure/overview-service.adapter"
import { roleFormSchema, buildRoleFormFields, defaultRoleFormValues, toCreateRoleDTO, type RoleFormValues } from "./config/role.config"

export type RoleFormHost = {
  defaultValues?: Partial<RoleFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function RoleForm({ host, onSuccess }: { host?: RoleFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()
  const { modules } = useOverview()
  const { refreshOverview } = useOverview()
  const fields = useMemo(() => buildRoleFormFields(modules), [modules])

  async function handleSubmit(values: RoleFormValues) {
    try {
      const payload = toCreateRoleDTO(values)
      const id = (host?.defaultValues as any)?.id
      const res = id ? await updateRbacRole(id, payload) : await createRbacRole(payload)
      if (res?.successful) {
        showAlert({ tone: "success", title: res.message || (id ? "Rol actualizado correctamente" : "Rol creado correctamente"), open: true, autoCloseMs: 4000 })
        refreshOverview()
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res?.message || (id ? "No se pudo actualizar el rol" : "No se pudo crear el rol"), open: true })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || ((host?.defaultValues as any)?.id ? "No se pudo actualizar el rol" : "No se pudo crear el rol"), description: status ? `Código: ${status}` : undefined, open: true })
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