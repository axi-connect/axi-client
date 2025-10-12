"use client"

import { useEffect, useState } from "react"
import { parseHttpError } from "@/core/services/api"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { listCompanyOptions } from "@/modules/companies/infrastructure/company-service.adapter"
import { createUser, updateUser, listRoleOptions } from "@/modules/users/infrastructure/user-service.adapter"
import { buildUserFormFields, defaultUserFormValues, toCreateUserDTO, userFormSchema, type UserFormValues } from "@/modules/users/ui/form/user.config"

export type UserFormHost = {
  closeModal?: () => void
  formMode?: "create" | "edit"
  refresh?: () => Promise<void> | void
  defaultValues?: Partial<UserFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

let cachedRoles: any[] | null = null
let cachedCompanies: any[] | null = null

export function UserForm({ host }: { host?: UserFormHost }) {
  // load options once per mount
  const [roles, setRoles] = useState<Array<{ id: number; name: string }>>([])
  const [companies, setCompanies] = useState<Array<{ id: number; name: string }>>([])

  useEffect(() => {
    if (cachedCompanies && cachedRoles) {
      setCompanies(cachedCompanies)
      setRoles(cachedRoles)
      return
    }
    
    let cancelled = false
    ;(async () => {
      try {
        const [c, r] = await Promise.all([
          listCompanyOptions({ limit: 100 }),
          listRoleOptions({ limit: 100 }),
        ])
        if (!cancelled) {
          cachedCompanies = c
          cachedRoles = r
          setCompanies(c as any)
          setRoles(r as any)
        }
      } catch (err) {
        console.error(err)
      }
    })()
    return () => { cancelled = true }
  }, [])
  
  async function handleSubmit(values: any) {
    try {
      const hasId = (host?.defaultValues as any)?.id
      if (hasId) {
        const id = (host?.defaultValues as any).id as string | number
        const partial = values as any
        const res = await updateUser(id, partial)
        if (res.successful) {
          host?.setAlert?.({ variant: "success", title: res.message || "Usuario actualizado correctamente" })
          await host?.refresh?.()
          host?.closeModal?.()
        } else {
          host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo actualizar el usuario" })
        }
      } else {
        const dto = toCreateUserDTO(values)
        const res = await createUser(dto)
        if (res.successful) {
          host?.setAlert?.({ variant: "success", title: res.message || "Usuario creado correctamente" })
          await host?.refresh?.()
          host?.closeModal?.()
        } else {
          host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo crear el usuario" })
        }
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      host?.setAlert?.({ variant: "destructive", title: message || ((host?.defaultValues as any)?.id ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario"), description: status ? `Código: ${status}` : undefined })
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
      fields={buildUserFormFields({ companies: companies as any, roles: roles as any, formMode: host?.formMode })}
    />
  )
}