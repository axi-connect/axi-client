"use client";

import { Suspense, use } from "react";
import { ActivityFormModal } from "@/modules/crm/ui/components/ActivityFormModal";

/** Modal interceptado de edición: la tarea se carga por id. */
export default function CrmTasksInterceptUpdate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <ActivityFormModal closeBehavior="back" taskId={id} />
    </Suspense>
  );
}
