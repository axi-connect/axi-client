import type { Metadata } from "next";

import { RoutineEditorView } from "@/modules/autopilot/ui/RoutineEditorView";

export const metadata: Metadata = { title: "Nuevo piloto" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** B2: desde «Escribirles» llega `?desde_busqueda=…&secuencia=…` para arrancar con esa búsqueda. */
export default async function NewRoutinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.desde_busqueda === "string" ? params.desde_busqueda : "";
  const sequence = typeof params.secuencia === "string" ? params.secuencia : "";
  const prefill = UUID.test(search) && UUID.test(sequence) ? { search_id: search, sequence_id: sequence } : null;
  return <RoutineEditorView routineId={null} prefill={prefill} />;
}
