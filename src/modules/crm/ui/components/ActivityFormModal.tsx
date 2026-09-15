"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import type { FollowUpMedium } from "@/modules/crm/domain/schedule-follow-up";
import { isAgentTask } from "@/modules/crm/domain/task-execution";
import { getTask } from "@/modules/crm/infrastructure/services/activities-service.adapter";
import { getContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { ActivityForm } from "@/modules/crm/ui/forms/ActivityForm";
import { ScheduleFollowUpForm } from "@/modules/crm/ui/forms/ScheduleFollowUpForm";

const TASKS_ROUTE = "/crm/tasks";

/**
 * Modal de crear/editar actividad o tarea, compartido por la ruta interceptada
 * y su gemela de navegación dura (patrón `AppointmentFormModal`).
 *
 * Existía solo como modal interceptado, y por eso un refresh sobre
 * `/crm/tasks/create` daba 404: un slot paralelo no tiene ruta propia. Con el
 * componente extraído, la página completa monta la bandeja y el modal encima,
 * y el enlace se puede compartir.
 */
export function ActivityFormModal({
  closeBehavior,
  taskId,
}: {
  /** `back` en la ruta interceptada; `replace` en el fallback full-page. */
  closeBehavior: "back" | "replace";
  /** Presente = edición. Se carga por id: el enlace profundo no trae la fila. */
  taskId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();

  const contactId = searchParams.get("contact_id");
  const contactLabel = searchParams.get("contact_label");
  const dealId = searchParams.get("deal_id");
  const executorParam = searchParams.get("executor");
  // F5: lo que propuso el copiloto. Se pasa por la URL para que el flujo sea el
  // MISMO que abre el operador a mano — así el aviso de ventana, el horario
  // silencioso y la plantilla de apertura se aplican igual a lo que sugiere la IA.
  const proposal = readProposal(searchParams);

  const [task, setTask] = useState<ActivityDTO | null>(null);
  const [contactName, setContactName] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // El slot paralelo conserva su contenido en la navegación suave: el modal se
  // cierra cuando la URL deja de ser la suya, no cuando alguien pulsa cerrar.
  const open =
    pathname !== null && (pathname.endsWith("/create") || pathname.includes("/update/"));

  const close = () => {
    if (closeBehavior === "back") router.back();
    else router.replace(TASKS_ROUTE);
  };

  useEffect(() => {
    if (taskId === undefined) return;
    let alive = true;
    void (async () => {
      try {
        const fresh = await getTask(taskId);
        if (!alive) return;
        setTask(fresh);
        // El DTO trae `contact_id`, no el nombre: sin esto el campo bloqueado
        // saldría vacío y parecería que la tarea perdió su contacto.
        const contact = await getContact(fresh.contact_id).catch(() => null);
        if (alive && contact !== null) setContactName(contact.full_name);
      } catch (err) {
        if (!alive) return;
        setFailed(true);
        showAlert({
          tone: "error",
          title: errorMessage(err, "No se pudo cargar la tarea"),
          open: true,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [taskId, showAlert]);

  const editing = taskId !== undefined;
  const loading = editing && task === null && !failed;

  // F2: el ramal de IA tiene su propio flujo («Programar seguimiento»), con la
  // zona del negocio, el aviso de ventana y la plantilla de apertura. Entra
  // por `?executor=agent` al crear, o al editar una tarea de agente.
  const agentBranch = (task !== null && isAgentTask(task)) || (!editing && executorParam === "agent");

  const presetContact =
    task !== null
      ? { id: task.contact_id, label: contactName ?? "Contacto" }
      : contactId !== null && contactLabel !== null
        ? { id: contactId, label: contactLabel }
        : undefined;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      config={{
        title: modalTitle(editing, agentBranch),
        description: modalDescription(editing, agentBranch),
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "crm-activity-cancel" },
          {
            label: agentBranch ? (editing ? "Guardar cambios" : "Programar seguimiento") : "Guardar",
            variant: "default",
            asClose: false,
            id: "crm-activity-save",
            onClick: () =>
              // Mientras carga no hay formulario montado: `requestSubmit` sobre
              // `null` no hace nada, que es exactamente lo correcto.
              (
                document.getElementById(
                  agentBranch ? "crm-follow-up-form" : "crm-activity-form",
                ) as HTMLFormElement | null
              )?.requestSubmit(),
          },
        ],
      }}
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : agentBranch ? (
        <ScheduleFollowUpForm
          {...(proposal === null ? {} : { proposal })}
          {...(presetContact === undefined ? {} : { presetContact })}
          {...(dealId === null ? {} : { dealId })}
          {...(task === null ? {} : { task })}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("crm:tasks:save:success"));
            close();
          }}
        />
      ) : (
        <ActivityForm
          {...(presetContact === undefined ? {} : { presetContact })}
          {...(dealId === null ? {} : { dealId })}
          {...(task === null ? {} : { task })}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("crm:tasks:save:success"));
            close();
          }}
        />
      )}
    </Modal>
  );
}

function modalTitle(editing: boolean, agentBranch: boolean): string {
  if (agentBranch) return editing ? "Editar seguimiento" : "Programar seguimiento";
  return editing ? "Editar actividad" : "Nueva actividad";
}

function modalDescription(editing: boolean, agentBranch: boolean): string {
  if (agentBranch) {
    return editing
      ? "Cambiar el objetivo o la fecha reinicia los intentos: el agente vuelve a empezar."
      : "El agente contacta al cliente con tu objetivo, a la hora que elijas, y sigue la conversación.";
  }
  return editing
    ? "Título, detalle, vencimiento y asignación."
    : "Nota, llamada, reunión o tarea con vencimiento y asignación.";
}

/** Lee la propuesta del copiloto de la URL. `null` si falta cualquier pieza:
 *  media propuesta es peor que ninguna — el operador no sabría qué revisar. */
function readProposal(
  params: URLSearchParams,
): { task_channel: FollowUpMedium; objective: string; due_in_hours: number } | null {
  const objective = params.get("objective");
  const medium = params.get("medium");
  const hours = Number(params.get("due_in_hours"));
  if (objective === null || medium === null || !Number.isFinite(hours) || hours <= 0) return null;
  if (medium !== "message" && medium !== "call" && medium !== "call_then_message") return null;
  return { task_channel: medium, objective, due_in_hours: hours };
}
