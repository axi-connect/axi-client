"use client"

import { parseHttpError } from "@/shared/api"
import { useOverview } from "../overview.context"
import { DynamicForm } from "@/components/dynamic-form"
import { createRbacModule } from "@/app/(private)/rbac/service"
import { buildModuleFormFields, defaultModuleFormValues, moduleFormSchema, type ModuleFormValues } from "./form.config"

export type ModuleFormHost = {
  closeModal?: () => void
  refresh?: () => Promise<void> | void
  defaultValues?: Partial<ModuleFormValues>
  setAlert?: (cfg: { variant: "default" | "destructive" | "success"; title: string; description?: string }) => void
}

export function ModuleForm({ host, onSuccess }: { host?: ModuleFormHost; onSuccess?: () => void }) {
  const { refreshModules } = useOverview()

  async function handleSubmit(values: ModuleFormValues) {
    try {
      const res = await createRbacModule(values)
      if (res.successful) {
        await refreshModules()
        host?.setAlert?.({ variant: "success", title: res.message || "Módulo creado correctamente" })
        await host?.refresh?.()
        host?.closeModal?.()
        onSuccess?.()
      } else {
        host?.setAlert?.({ variant: "destructive", title: res.message || "No se pudo crear el módulo" })
      }
    } catch (err) {
      const { status, message } = parseHttpError(err)
      host?.setAlert?.({ variant: "destructive", title: message || "No se pudo crear el módulo", description: status ? `Código: ${status}` : undefined })
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