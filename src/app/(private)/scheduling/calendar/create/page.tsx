"use client";

import { Suspense } from "react";
import { CalendarView } from "@/modules/scheduling/ui/CalendarView";
import { AppointmentFormModal } from "@/modules/scheduling/ui/components/AppointmentFormModal";

/** Hard-nav (refresh, deep-link): calendario + modal inline. */
export default function SchedulingCreateHardNavPage() {
  return (
    <>
      <CalendarView />
      <Suspense fallback={null}>
        <AppointmentFormModal closeBehavior="replace" />
      </Suspense>
    </>
  );
}
