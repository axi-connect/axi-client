"use client";

import { use } from "react";
import { AppointmentSheetRoute } from "@/modules/scheduling/ui/components/appointment-detail/AppointmentSheetRoute";

/** Rail interceptado de la cita: URL compartible, el back del navegador cierra. */
export default function AppointmentSheetPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  return <AppointmentSheetRoute appointmentId={appointmentId} closeBehavior="back" />;
}
