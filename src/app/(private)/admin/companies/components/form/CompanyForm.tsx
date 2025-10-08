"use client"

import { parseHttpError } from "@/shared/api"
import { DynamicForm } from "@/components/features/dynamic-form"
import { createCompany, updateCompany } from "../../service"
import { buildCompanyFormFields, companyFormSchema, defaultCompanyFormValues, toCreateCompanyDTO, type CompanyFormValues } from "./form.config"

export type CompanyFormHost = {
  closeModal?: () => void
  refresh?: () => Promise<void> | void
  defaultValues?: Partial<CompanyFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function CompanyForm({ host }: { host?: CompanyFormHost }) {
  async function handleSubmit(values: any) {
    try {
      const hasId = (host?.defaultValues as any)?.id
      if (hasId) {
        const id = (host?.defaultValues as any).id as string | number
        const partial = values as any
        const res = await updateCompany(id, partial)
        if (res.successful) {
          host?.setAlert?.({ variant: "success", title: res.message || "Empresa actualizada correctamente" })
          await host?.refresh?.()
          host?.closeModal?.()
        } else {
          host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo actualizar la empresa" })
        }
      } else {
        const dto = toCreateCompanyDTO(values)
        const res = await createCompany(dto)
        if (res.successful) {
          host?.setAlert?.({ variant: "success", title: res.message || "Empresa creada correctamente" })
          await host?.refresh?.()
          host?.closeModal?.()
        } else {
          host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo crear la empresa" })
        }
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      host?.setAlert?.({ variant: "destructive", title: message || ((host?.defaultValues as any)?.id ? "No se pudo actualizar la empresa" : "No se pudo crear la empresa"), description: status ? `Código: ${status}` : undefined })
    }
  }

  return (
    <DynamicForm
      gap={4}
      id="company-form"
      onSubmit={handleSubmit}
      schema={companyFormSchema}
      columns={{ sm: 1, md: 2 }}
      fields={buildCompanyFormFields()}
      defaultValues={{ ...defaultCompanyFormValues, ...(host?.defaultValues ?? {}) }}
    />
  )
}