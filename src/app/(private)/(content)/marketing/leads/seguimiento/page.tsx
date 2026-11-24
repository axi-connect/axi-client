import { redirect } from "next/navigation";

/**
 * El seguimiento es de UNA secuencia: sin id, la miga «Seguimiento» lleva a la
 * lista de secuencias (sin esta página era un 404).
 */
export default function SequenceTrackingIndexPage() {
  redirect("/crm/settings/sequences");
}
