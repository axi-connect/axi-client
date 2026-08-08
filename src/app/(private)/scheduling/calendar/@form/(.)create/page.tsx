"use client";

import { Suspense } from "react";
import { AppointmentFormModal } from "@/modules/scheduling/ui/components/AppointmentFormModal";

/**
 * Modal interceptado de crear/reagendar cita (acepta `?reschedule=<id>`).
 * `useSearchParams` exige Suspense.
 */
export default function SchedulingInterceptCreate() {
  return (
    <Suspense fallback={null}>
      <AppointmentFormModal closeBehavior="back" />
    </Suspense>
  );
}
