"use client";

import { useEffect, useMemo, useState } from "react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { ActivityKind } from "@/modules/crm/domain/activity";
import { createActivity } from "@/modules/crm/infrastructure/services/activities-service.adapter";
import { listAssignableUsers } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import {
  activityFormSchema,
  buildActivityFormFields,
  defaultActivityFormValues,
  toCreateActivityDTO,
  type ActivityFormValues,
} from "./config/activity.config";

/**
 * Alta de actividad/tarea (POST /crm/activities). Reutilizable desde la
 * bandeja (contacto libre), el 360 y el rail del deal (contacto fijado y
 * deal vinculado). Guardar dispara `requestSubmit()` por `crm-activity-form`.
 */
export function ActivityForm({
  presetContact,
  presetKind,
  dealId,
  onSuccess,
}: {
  presetContact?: { id: string; label: string };
  presetKind?: ActivityKind;
  dealId?: string;
  onSuccess: () => void;
}) {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    listAssignableUsers()
      .then((all) => setUsers(all.filter((user) => user.status === "active")))
      .catch(() => setUsers([]));
  }, []);

  const defaultValues = useMemo(
    () => defaultActivityFormValues({ contact: presetContact, kind: presetKind }),
    [presetContact, presetKind],
  );
  const fields = useMemo(
    () => buildActivityFormFields({ users, contactLocked: presetContact !== undefined }),
    [users, presetContact],
  );

  return (
    <DynamicForm<ActivityFormValues>
      id="crm-activity-form"
      schema={activityFormSchema}
      fields={[...fields]}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          await createActivity(toCreateActivityDTO(values, dealId));
          showAlert({
            tone: "success",
            title: values.kind === "task" ? "Tarea creada" : "Actividad registrada",
            open: true,
          });
          onSuccess();
        } catch (err) {
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo guardar la actividad"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
