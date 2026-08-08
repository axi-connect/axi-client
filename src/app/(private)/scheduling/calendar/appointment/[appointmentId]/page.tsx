"use client";

import { use } from "react";
import { CalendarView } from "@/modules/scheduling/ui/CalendarView";
import { AppointmentSheetRoute } from "@/modules/scheduling/ui/components/appointment-detail/AppointmentSheetRoute";

/** Hard-nav (refresh, deep-link): calendario + rail inline. */
export default function AppointmentHardNavPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  return (
    <>
      <CalendarView />
      <AppointmentSheetRoute appointmentId={appointmentId} closeBehavior="replace" />
    </>
  );
}
