import type { Metadata } from "next";

import { CommercialView } from "@/modules/commercial/ui/CommercialView";

export const metadata: Metadata = { title: "Comercial" };

/** La ruta del mes: meta, ritmo, resultados clave y las acciones recomendadas. */
export default function ComercialPage() {
  return <CommercialView />;
}
