"use client";

import { Suspense } from "react";
import { TasksView } from "@/modules/crm/ui/TasksView";
import { ActivityFormModal } from "@/modules/crm/ui/components/ActivityFormModal";

/** Hard-nav (refresh, deep-link): bandeja + modal inline. Sin esta gemela, un
 *  refresh sobre /crm/tasks/create daba 404 — un slot paralelo no es ruta. */
export default function CrmTasksCreateHardNavPage() {
  return (
    <>
      <TasksView />
      <Suspense fallback={null}>
        <ActivityFormModal closeBehavior="replace" />
      </Suspense>
    </>
  );
}
