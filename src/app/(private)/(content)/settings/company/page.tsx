"use client"

import { useCallback, useEffect, useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { SchedulesEditor } from "@/modules/companies/ui/forms/SchedulesEditor"
import { getMyCompany, updateMyCompany } from "@/modules/companies/infrastructure/services/company-service.adapter"
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert"
import type { CompanyDTO, CompanyStatus } from "@/modules/companies/domain/company"
import {
  buildCompanyFormFields,
  companyFormSchema,
  companyToFormValues,
  toUpdateCompanyDTO,
  type CompanyFormValues,
} from "@/modules/companies/ui/forms/config/company.config"

const STATUS_LABELS: Record<CompanyStatus, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active: { label: "Activa", variant: "default" },
  trial: { label: "Prueba", variant: "secondary" },
  suspended: { label: "Suspendida", variant: "destructive" },
}

/**
 * Ajustes de la empresa del tenant (`GET/PATCH /companies/me` +
 * `PUT /companies/me/schedules`). No es un CRUD de lista: cada tenant
 * ve y edita únicamente su propia empresa.
 */
export default function CompanySettingsPage() {
  const [company, setCompany] = useState<CompanyDTO | null>(null)
  const [alertOpen, setAlertOpen] = useState(false)
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null)

  const setAlert = useCallback((cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg)
    setAlertOpen(true)
  }, [])

  const load = useCallback(async () => {
    try {
      setCompany(await getMyCompany())
    } catch (err) {
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo cargar la empresa") })
    }
  }, [setAlert])

  useEffect(() => { void load() }, [load])

  const handleSubmit = async (values: CompanyFormValues, form: UseFormReturn<CompanyFormValues>) => {
    try {
      await updateMyCompany(toUpdateCompanyDTO(values))
      setAlert({ variant: "success", title: "Empresa actualizada correctamente" })
      await load()
    } catch (err) {
      if (applyServerValidation(err, form)) return
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo actualizar la empresa") })
    }
  }

  if (!company) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const status = STATUS_LABELS[company.status]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-tight font-semibold">Mi empresa</h1>
          <p className="text-sm text-muted-foreground">
            Datos de la empresa y horario de atención (la IA los usa como contexto).
          </p>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Datos de plataforma, solo lectura */}
      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border-soft glass shadow-sm p-4 md:grid-cols-4 md:p-6">
        <div>
          <div className="text-xs text-muted-foreground">NIT</div>
          <div className="text-sm font-medium">{company.nit}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">País</div>
          <div className="text-sm font-medium">{company.country_code}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Moneda</div>
          <div className="text-sm font-medium">{company.currency}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Creada</div>
          <div className="text-sm font-medium">{new Date(company.created_at).toLocaleDateString()}</div>
        </div>
      </div>

      <section className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <h2 className="mb-4 text-lg font-medium">Información general</h2>
        <DynamicForm
          gap={4}
          id="company-form"
          schema={companyFormSchema}
          columns={{ sm: 1, md: 2 }}
          defaultValues={companyToFormValues(company)}
          fields={buildCompanyFormFields()}
          onSubmit={handleSubmit}
          actions={{ submitLabel: "Guardar cambios" }}
        />
      </section>

      <section className="rounded-xl border border-border-soft glass shadow-sm p-4 md:p-6">
        <h2 className="mb-1 text-lg font-medium">Horario de atención</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Define los días y horas en que tu equipo atiende. Fuera de este horario la IA lo informa al cliente.
        </p>
        <SchedulesEditor
          schedules={company.schedules}
          onSaved={() => {
            setAlert({ variant: "success", title: "Horario actualizado correctamente" })
            void load()
          }}
          onError={(message) => setAlert({ variant: "destructive", title: message })}
        />
      </section>

      <FloatingAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        config={{
          variant: alertConfig?.variant ?? "default",
          title: alertConfig?.title ?? "",
          description: alertConfig?.description,
          durationMs: 4000,
        }}
      />
    </div>
  )
}
