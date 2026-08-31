"use client";

import { useEffect, useMemo, useState } from "react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";
import type { ActivityDTO, ActivityKind } from "@/modules/crm/domain/activity";
import {
  createActivity,
  createAgentTask,
  updateActivity,
  updateAgentTask,
} from "@/modules/crm/infrastructure/services/activities-service.adapter";
import { listAssignableUsers } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import {
  activityFormSchema,
  buildActivityFormFields,
  defaultActivityFormValues,
  editActivityFormValues,
  toCreateActivityDTO,
  toCreateAgentTaskDTO,
  toUpdateActivityDTO,
  toUpdateAgentTaskDTO,
  type ActivityFormValues,
} from "./config/activity.config";

/**
 * Alta y edición de actividad/tarea. Reutilizable desde la bandeja (contacto
 * libre), el 360 y el rail del deal (contacto fijado y deal vinculado).
 * Guardar dispara `requestSubmit()` por `crm-activity-form`.
 *
 * Cuatro destinos, no uno: crear/editar × persona/agente. El ramal de IA va
 * por `/crm/agent-tasks` porque el permiso es distinto (`crm:automate`):
 * escribir una nota y programar que la IA le hable a un cliente no son la
 * misma autorización. Elegirlo aquí y no en el config mantiene el config como
 * lo que es —descripción de campos— y deja el enrutado donde se decide.
 */
export function ActivityForm({
  presetContact,
  presetKind,
  presetExecutor,
  dealId,
  task,
  onSuccess,
}: {
  presetContact?: { id: string; label: string };
  presetKind?: ActivityKind;
  presetExecutor?: "user" | "agent";
  dealId?: string;
  /** Presente = edición. El tipo y el ejecutor quedan bloqueados. */
  task?: ActivityDTO;
  onSuccess: () => void;
}) {
  const { showAlert } = useAlert();
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [agents, setAgents] = useState<readonly AssignableAgent[]>([]);

  useEffect(() => {
    listAssignableUsers()
      .then((all) => setUsers(all.filter((user) => user.status === "active")))
      .catch(() => setUsers([]));
    // Degrada a lista vacía: sin agentes el ramal de IA no se ofrece, que es
    // exactamente lo que debe pasar si no se pueden consultar.
    getTenantAgents()
      .then(setAgents)
      .catch(() => setAgents([]));
  }, []);

  const editing = task !== undefined;

  const defaultValues = useMemo(
    () =>
      task === undefined
        ? defaultActivityFormValues({
            contact: presetContact,
            kind: presetKind,
            executor: presetExecutor,
          })
        : editActivityFormValues(task, presetContact),
    [task, presetContact, presetKind, presetExecutor],
  );
  const fields = useMemo(
    () =>
      buildActivityFormFields({
        users,
        agents,
        contactLocked: presetContact !== undefined || editing,
        locked: editing,
      }),
    [users, agents, presetContact, editing],
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
        const agentBranch = values.kind === "task" && values.executor === "agent";
        try {
          if (task !== undefined) {
            await (agentBranch
              ? updateAgentTask(task.id, toUpdateAgentTaskDTO(values))
              : updateActivity(task.id, toUpdateActivityDTO(values)));
          } else {
            await (agentBranch
              ? createAgentTask(toCreateAgentTaskDTO(values, dealId))
              : createActivity(toCreateActivityDTO(values, dealId)));
          }
          showAlert({
            tone: "success",
            title: taskSavedTitle(values.kind, agentBranch, editing),
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

function taskSavedTitle(kind: ActivityKind, agentBranch: boolean, editing: boolean): string {
  if (kind !== "task") return "Actividad registrada";
  if (agentBranch) return editing ? "Tarea del agente actualizada" : "El agente la ejecutará";
  return editing ? "Tarea actualizada" : "Tarea creada";
}
