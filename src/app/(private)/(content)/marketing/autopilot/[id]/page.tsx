import type { Metadata } from "next";

import { RoutineDetailView } from "@/modules/autopilot/ui/RoutineDetailView";

export const metadata: Metadata = { title: "Ruta" };

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoutineDetailView routineId={id} />;
}
