"use client"

import { useEffect, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import type { SelectOption } from "@/shared/api/query"
import { errorMessage, applyServerValidation } from "@/core/lib/error-messages"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { listRoles } from "@/modules/rbac/infrastructure/services/rbac-service.adapter"
import { createUser, updateUser } from "@/modules/users/infrastructure/services/user-service.adapter"
import {
  buildUserFormFields,
  defaultUserFormValues,
  toCreateUserDTO,
  toUpdateUserDTO,
  userFormSchema,
  type UserFormValues,
} from "./config/user.config"

export type UserFormHost = {
  closeModal?: () => void
  formMode?: "create" | "edit"
  refresh?: () => Promise<void> | void
  defaultValues?: (Partial<UserFormValues> & { id?: string }) | null
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function UserForm({ host }: { host?: UserFormHost }) {
  const [roles, setRoles] = useState<SelectOption[]>([])
  const isEdit = Boolean(host?.defaultValues?.id)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listRoles()
        if (!cancelled) {
          setRoles(res.data.map((r) => ({ id: r.id, label: r.name })))
        }
      } catch {
        // El select queda vacío; el submit fallará con validación clara.
      }
    })()
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (values: UserFormValues, form: UseFormReturn<UserFormValues>) => {
    try {
      const id = host?.defaultValues?.id
      if (id) {
        await updateUser(id, toUpdateUserDTO(values))
        host?.setAlert?.({ variant: "success", title: "Usuario actualizado correctamente" })
      } else {
        await createUser(toCreateUserDTO(values))
        host?.setAlert?.({ variant: "success", title: "Usuario creado correctamente" })
      }
      await host?.refresh?.()
      host?.closeModal?.()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      host?.setAlert?.({
        variant: "destructive",
        title: errorMessage(err, isEdit ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario"),
      })
    }
  }

  return (
    <DynamicForm
      gap={4}
      id="user-form"
      onSubmit={handleSubmit}
      schema={userFormSchema}
      columns={{ sm: 1, md: 2 }}
      defaultValues={{ ...defaultUserFormValues, ...(host?.defaultValues ?? {}) }}
      fields={buildUserFormFields({ roles, formMode: host?.formMode ?? (isEdit ? "edit" : "create") })}
    />
  )
}
