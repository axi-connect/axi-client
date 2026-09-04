"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  invalidateMyCompanyCache,
  loadMyCompanyOnce,
  SchedulesEditor,
  WEEKDAY_LABELS,
  type CompanyDTO,
} from "@/modules/companies/public";
import { useCalendarStore } from "@/modules/scheduling/infrastructure/stores/calendar.store";
import { SettingsForm } from "./forms/SettingsForm";

/**
 * Configuración de la agenda: dos cards — reglas de agendamiento
 * (`/scheduling/settings`) y horario de atención (slice companies). Ambas
 * gobiernan TAMBIÉN al asistente de IA; el copy lo deja claro.
 */
export function SchedulingSettingsView() {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const refreshCalendar = useCalendarStore((s) => s.refresh);

  const [company, setCompany] = useState<CompanyDTO | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const canManage = hasPermission("scheduling:manage");

  useEffect(() => {
    let alive = true;
    loadMyCompanyOnce()
      .then((data) => {
        if (alive) setCompany(data);
      })
      .catch((err: unknown) => {
        if (alive) setCompanyError(errorMessage(err, "No se pudo cargar la empresa"));
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-base font-semibold tracking-tight">Reglas de agendamiento</h2>
        <p className="mb-5 mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-accent-violet" />
          <span>
            Aplican a las citas creadas desde este panel <b>y a las que agenda el asistente de
            IA</b> en las conversaciones. Los cambios rigen de inmediato, sin reinicios.
          </span>
        </p>
        <SettingsForm canManage={canManage} />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-base font-semibold tracking-tight">Horario de atención</h2>
        <p className="mb-5 mt-1 text-xs text-muted-foreground">
          De estas franjas salen los horarios que ofrece el asistente de IA y las sugerencias
          del calendario. Zona horaria del negocio:{" "}
          <b className="font-medium text-foreground">{company?.timezone ?? "…"}</b>{" "}
          <span className="opacity-70">(se cambia en el perfil de la empresa)</span>.
        </p>

        {companyError !== null && (
          <p className="text-sm text-destructive">{companyError}</p>
        )}
        {company === null && companyError === null && (
          <div className="space-y-2" role="status" aria-label="Cargando horario">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        )}
        {company !== null &&
          (canManage ? (
            <SchedulesEditor
              key={reloadKey}
              schedules={company.schedules}
              onSaved={() => {
                showAlert({
                  tone: "success",
                  title: "Horario de atención guardado",
                  description: "Las citas ya agendadas no se mueven.",
                  open: true,
                });
                // El calendario y la IA leen el horario nuevo: invalidar cache
                // por sesión de /companies/me y recargar esta vista.
                invalidateMyCompanyCache();
                setCompany(null);
                setReloadKey((k) => k + 1);
                void refreshCalendar();
              }}
              onError={(message) =>
                showAlert({ tone: "error", title: message, open: true })
              }
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {company.schedules.length === 0 && (
                <li className="text-muted-foreground">Sin horario configurado.</li>
              )}
              {company.schedules.map((schedule) => (
                <li
                  key={schedule.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span>{WEEKDAY_LABELS[schedule.weekday]}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {schedule.opens_at} – {schedule.closes_at}
                  </span>
                </li>
              ))}
            </ul>
          ))}
      </section>
    </div>
  );
}
