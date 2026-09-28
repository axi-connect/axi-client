"use client";

import { use } from "react";
import { ContactFormModal } from "@/modules/crm/ui/forms/ContactFormModal";

/** Modal interceptado de edición: carga el contacto y precarga el formulario. */
export default function CrmContactsInterceptUpdate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ContactFormModal contactId={id} />;
}
