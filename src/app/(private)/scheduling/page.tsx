import { redirect } from "next/navigation";

/** El nodo del sidebar apunta a /scheduling; el calendario es la vista default. */
export default function SchedulingPage() {
  redirect("/scheduling/calendar");
}
