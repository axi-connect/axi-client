"use client";

import { useRouter } from "next/navigation";
import { ContactImportWizard } from "@/modules/crm/ui/components/imports/ContactImportWizard";

/**
 * `/crm/contacts/import` en navegación dura o refresh (la interceptada
 * `@form/(.)import` cubre la navegación suave): el mismo asistente en una
 * tarjeta, con cabeceras propias.
 */
export default function CrmContactsImportPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-background p-4 md:p-6">
      <ContactImportWizard variant="embedded" onClose={() => router.push("/crm/contacts")} />
    </div>
  );
}
