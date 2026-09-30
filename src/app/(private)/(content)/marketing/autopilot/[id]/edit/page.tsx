import type { Metadata } from "next";

import { RoutineEditorView } from "@/modules/autopilot/ui/RoutineEditorView";

export const metadata: Metadata = { title: "Editar piloto" };

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RoutineEditorView routineId={id} />;
}
