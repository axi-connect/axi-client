"use client";

import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, RotateCcw } from "lucide-react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { SchedulingSettingsDTO } from "@/modules/scheduling/domain/settings";
import {
  getSchedulingSettings,
  putSchedulingSettings,
} from "@/modules/scheduling/infrastructure/services/scheduling-settings-service.adapter";
import {
  buildSettingsFormFields,
  fromSettingsDto,
  settingsFormSchema,
  toSettingsPayload,
  type SettingsFormValues,
} from "./config/settings.config";

/**
 * Reglas de agendamiento (`GET/PUT /scheduling/settings`). El formulario se
 * inicializa desde el GET RESUELTO y el PUT manda SIEMPRE los 5 campos (el
 * PUT es de sección completa: omitir un campo lo resetearía al default del
 * sistema). La respuesta del PUT es la vista resuelta → re-hidrata el form.
 */
export function SettingsForm({ canManage }: { canManage: boolean }) {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState<SchedulingSettingsDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setError(null);
    getSchedulingSettings()
      .then((data) => {
        if (alive) setSettings(data);
      })
      .catch((err: unknown) => {
        if (alive) setError(errorMessage(err, "No se pudieron cargar los parámetros"));
      });
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const fields = useMemo(() => buildSettingsFormFields({ canManage }), [canManage]);
  const defaultValues = useMemo(
    () => (settings === null ? undefined : fromSettingsDto(settings)),
    [settings],
  );

  if (error !== null) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-2.5 text-sm">
        <span className="min-w-0 flex-1">{error}</span>
        <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
          <RotateCcw aria-hidden className="size-3.5" /> Reintentar
        </Button>
      </div>
    );
  }

  if (settings === null || defaultValues === undefined) {
    return (
      <div className="space-y-3" role="status" aria-label="Cargando parámetros">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <DynamicForm<SettingsFormValues>
      schema={settingsFormSchema}
      fields={fields}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{
        render: ({ submitting, dirty }) =>
          canManage ? (
            <div className="flex justify-end gap-2 pt-2">
              <Button type="submit" disabled={submitting || !dirty}>
                {submitting && (
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                )}
                Guardar reglas
              </Button>
            </div>
          ) : null,
      }}
      onSubmit={async (values, form) => {
        try {
          const resolved = await putSchedulingSettings(toSettingsPayload(values));
          setSettings(resolved);
          form.reset(fromSettingsDto(resolved));
          showAlert({
            tone: "success",
            title: "Reglas de agendamiento guardadas",
            description: "Aplican de inmediato al panel y al asistente de IA.",
            open: true,
          });
        } catch (err) {
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudieron guardar las reglas"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
