"use client"

import { parseHttpError } from "@/shared/api"
import { DynamicForm } from "@/components/features/dynamic-form"
import { useAlert } from "@/components/providers/alert-provider"
import { useOverview } from "../../infrastructure/overview.context"
import { createRbacModule } from "../../infrastructure/overview-service.adapter"
import { buildModuleFormFields, defaultModuleFormValues, moduleFormSchema, type ModuleFormValues } from "./config/module.config"

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
        refreshOverview()
        showAlert({ tone: "success", title: res.message || "Módulo creado correctamente", open: true, autoCloseMs: 4000 })
        onSuccess?.()
      } else {
        showAlert({ tone: "error", title: res.message || "No se pudo crear el módulo", open: true })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      showAlert({ tone: "error", title: message || "No se pudo crear el módulo", description: status ? `Código: ${status}` : undefined, open: true })
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