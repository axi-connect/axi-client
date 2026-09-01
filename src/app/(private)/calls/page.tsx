import { redirect } from "next/navigation";

/** El nodo del sidebar apunta a /calls; hasta que llegue el Monitoreo (F4-C),
 * la vista default es el historial. */
export default function CallsPage() {
  redirect("/calls/history");
}
