"use client";

import { ContactFormModal } from "@/modules/crm/ui/forms/ContactFormModal";

/** Modal interceptado de creación (URL compartible; back cierra). */
export default function CrmContactsInterceptCreate() {
  return <ContactFormModal />;
}
