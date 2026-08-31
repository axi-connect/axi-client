"use client";

import { Suspense } from "react";
import { ActivityFormModal } from "@/modules/crm/ui/components/ActivityFormModal";

/** Modal interceptado (acepta ?contact_id&contact_label&deal_id&executor). */
export default function CrmTasksInterceptCreate() {
  return (
    <Suspense fallback={null}>
      <ActivityFormModal closeBehavior="back" />
    </Suspense>
  );
}
