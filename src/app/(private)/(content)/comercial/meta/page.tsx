import type { Metadata } from "next";

import { GoalEditorView } from "@/modules/commercial/ui/GoalEditorView";

export const metadata: Metadata = { title: "Meta del mes" };

/** «¿Cuánto quieres vender en {mes}?»: fijar o cambiar la meta. */
export default function ComercialMetaPage() {
  return <GoalEditorView />;
}
