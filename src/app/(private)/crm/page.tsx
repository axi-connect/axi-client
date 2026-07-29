import { redirect } from "next/navigation";

/** Raíz de la sección: aterriza en el pipeline (el corazón del CRM). */
export default function CrmIndexPage() {
  redirect("/crm/pipeline");
}
