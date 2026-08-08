"use client";

import { useMemo } from "react";
import { isHttpError } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { ChannelDTO } from "@/modules/channels/public";
import type { ReminderDTO } from "@/modules/scheduling/domain/reminder";
import {
  createReminder,
  updateReminder,
} from "@/modules/scheduling/infrastructure/services/reminders-service.adapter";
import {
  buildReminderFormFields,
  defaultReminderFormValues,
  reminderFormSchema,
  reminderFormValuesFrom,
  toCreateReminderDto,
  toUpdateReminderDto,
  type ReminderFormValues,
} from "./config/reminder.config";

export const REMINDER_FORM_ID = "reminder-form";

export type ReminderFormMode =
  | { kind: "create" }
  | { kind: "edit"; reminder: ReminderDTO; contactLabel: string };

/**
 * Crear / editar recordatorio manual. Vive en un Dialog local de la vista
 * (sin slot: no amerita deep-link); Guardar dispara `requestSubmit()`.
 * 422 `scheduling/no_channel_identity` → error inline bajo el canal.
 */
export function ReminderForm({
  mode,
  channels,
  timezone,
  onSuccess,
}: {
  mode: ReminderFormMode;
  channels: ChannelDTO[];
  timezone: string;
  onSuccess: (fresh: ReminderDTO) => void;
}) {
  const { showAlert } = useAlert();

  const { values: defaultValues, unparsedRrule } = useMemo(
    () =>
      mode.kind === "edit"
        ? reminderFormValuesFrom(mode.reminder, mode.contactLabel, timezone)
        : { values: defaultReminderFormValues(), unparsedRrule: null },
    [mode, timezone],
  );

  const fields = useMemo(
    () =>
      buildReminderFormFields({
        mode: mode.kind,
        channels,
        timezone,
        unparsedRrule,
      }),
    [mode.kind, channels, timezone, unparsedRrule],
  );

  return (
    <DynamicForm<ReminderFormValues>
      id={REMINDER_FORM_ID}
      schema={reminderFormSchema}
      fields={fields}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          const fresh =
            mode.kind === "create"
              ? await createReminder(toCreateReminderDto(values, timezone))
              : await updateReminder(mode.reminder.id, toUpdateReminderDto(values, timezone));
          showAlert({
            tone: "success",
            title: mode.kind === "create" ? "Recordatorio creado" : "Recordatorio actualizado",
            description:
              fresh.next_run_at !== null ? "Quedó programado para su próximo envío." : undefined,
            open: true,
          });
          onSuccess(fresh);
        } catch (err) {
          if (isHttpError(err) && err.is("scheduling/no_channel_identity")) {
            form.setError("channel_id", { message: errorMessage(err) });
            return;
          }
          if (isHttpError(err) && err.is("scheduling/invalid_rrule")) {
            form.setError("rec_time", { message: "La recurrencia no es válida" });
            return;
          }
          if (isHttpError(err) && err.is("scheduling/invalid_time_range")) {
            form.setError(values.mode === "once" ? "once_date" : "rec_time", {
              message: "El envío debe quedar en el futuro",
            });
            return;
          }
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo guardar el recordatorio"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
