import { DocumentsTab } from "@/modules/documents/public";

export const metadata = { title: "Documentos · Mi empresa" };

/**
 * Pestaña «Documentos» de Mi empresa (F7 Cobros): plantillas por bloques con
 * vista previa fiel, emisor y numeración. Gateada por la función `documents`.
 */
export default function CompanyDocumentsPage() {
  return <DocumentsTab />;
}
