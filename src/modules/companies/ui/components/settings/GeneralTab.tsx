"use client"

import type { UseFormReturn } from "react-hook-form"
import { useAlert } from "@/core/providers/alert-provider"
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages"
import { DynamicForm } from "@/shared/components/features/dynamic-form"
import { FieldList } from "@/shared/components/features/field-list"
import { SchedulesEditor } from "@/modules/companies/ui/forms/SchedulesEditor"
import { updateMyCompany } from "@/modules/companies/infrastructure/services/company-service.adapter"
import { useMyCompany } from "@/modules/companies/infrastructure/hooks/use-my-company"
import {
  buildCompanyFormFields,
  companyFormSchema,
  companyToFormValues,
  toUpdateCompanyDTO,
  type CompanyFormValues,
} from "@/modules/companies/ui/forms/config/company.config"
import { CompanySettingsSkeleton } from "./CompanySettingsSkeleton"

/**
 * Pestaña General de Mi empresa (`PATCH /companies/me` + `PUT /companies/me/schedules`).
 * Guardar hace `refresh()` del store: el sidebar y el banner se repintan con el
 * nombre y logo nuevos (antes quedaban viejos hasta recargar).
 */
export function GeneralTab() {
  const { company, loading, refresh } = useMyCompany()
  const { showAlert } = useAlert()

  if (!company) {
    if (loading) return <CompanySettingsSkeleton />
    return (
      <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        No pudimos cargar la empresa. Recarga la página o vuelve a intentarlo.
      </p>
    )
  }

  const handleSubmit = async (values: CompanyFormValues, form: UseFormReturn<CompanyFormValues>) => {
    try {
      await updateMyCompany(toUpdateCompanyDTO(values))
      await refresh()
      showAlert({ tone: "success", title: "Empresa actualizada", open: true })
    } catch (err) {
      if (applyServerValidation(err, form)) return
      showAlert({
        tone: "error",
        title: "No se pudo actualizar la empresa",
        description: errorMessage(err),
        open: true,
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Datos de plataforma, solo lectura. Tarjeta SÓLIDA: el glass es para superficies flotantes. */}
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <FieldList
          layout="grid"
          items={[
            { label: "NIT", value: <span className="tabular-nums">{company.nit}</span> },
            { label: "País", value: company.country_code },
            { label: "Moneda", value: company.currency },
            {
              label: "Creada",
              value: <span className="tabular-nums">{new Date(company.created_at).toLocaleDateString()}</span>,
            },
          ]}
        />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-lg font-medium">Información general</h2>
        <p className="mb-4 text-sm text-muted-foreground">Lo que la IA sabe de tu empresa cuando atiende.</p>
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

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="mb-1 text-lg font-medium">Horario de atención</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Horario general de la empresa: fuera de él la IA lo informa al cliente. Cada sucursal
          puede definir el suyo; si no, usa este.
        </p>
        <SchedulesEditor
          key={company.updated_at}
          schedules={company.schedules}
          onSaved={() => {
            showAlert({ tone: "success", title: "Horario actualizado", open: true })
            void refresh()
          }}
          onError={(message) => showAlert({ tone: "error", title: message, open: true })}
        />
      </section>
    </div>
  )
}
