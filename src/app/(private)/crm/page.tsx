import { redirect } from "next/navigation";

/** Raíz de la sección: aterriza en Contactos (pasará a /crm/pipeline en F3). */
export default function CrmIndexPage() {
  redirect("/crm/contacts");
}
