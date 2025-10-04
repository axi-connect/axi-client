"use client"

import { parseHttpError } from "@/shared/api"
import { useOverview } from "../../context/overview.context"
import { createRbacModule } from "@/app/(private)/rbac/service"
import { DynamicForm } from "@/components/features/dynamic-form"
import { useAlert } from "@/components/providers/alert-provider"
import { buildModuleFormFields, defaultModuleFormValues, moduleFormSchema, type ModuleFormValues } from "./form.config"

export type ModuleFormHost = {
  defaultValues?: Partial<ModuleFormValues>
}

export function ModuleForm({ host, onSuccess }: { host?: ModuleFormHost; onSuccess?: () => void }) {
  const { showAlert } = useAlert()
  const { refreshOverview } = useOverview()

  async function handleSubmit(values: ModuleFormValues) {
    try {
      const res = await createRbacModule(values)
      if (res.successful) {
        // await refreshOverview()
        showAlert({ tone: "success", title: res.message || "Módulo creado correctamente", autoCloseMs: 3000 })
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res.message || "No se pudo crear el módulo" })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || "No se pudo crear el módulo", description: status ? `Código: ${status}` : undefined })
    }
  }

  return (
    <DynamicForm<ModuleFormValues>
      gap={4}
      id="rbac-module-form"
      schema={moduleFormSchema}
      fields={buildModuleFormFields()}
      columns={{ base: 1, md: 2 }}
      defaultValues={{ ...defaultModuleFormValues, ...(host?.defaultValues ?? {}) }}
      onSubmit={handleSubmit}
    />
  )
}