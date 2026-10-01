import type { Metadata } from "next";

import { RoutineEditorView } from "@/modules/autopilot/ui/RoutineEditorView";

export const metadata: Metadata = { title: "Nuevo piloto" };

export default function NewRoutinePage() {
  return <RoutineEditorView routineId={null} />;
}
