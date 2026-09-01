"use client";

import { Suspense, use } from "react";
import { TasksView } from "@/modules/crm/ui/TasksView";
import { ActivityFormModal } from "@/modules/crm/ui/components/ActivityFormModal";

/** Hard-nav de la edición: bandeja + modal, enlace compartible. */
export default function CrmTasksUpdateHardNavPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <>
      <TasksView />
      <Suspense fallback={null}>
        <ActivityFormModal closeBehavior="replace" taskId={id} />
      </Suspense>
    </>
  );
}
