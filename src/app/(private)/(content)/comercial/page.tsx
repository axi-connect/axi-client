import type { Metadata } from "next";

import { CommercialView } from "@/modules/commercial/ui/CommercialView";

export const metadata: Metadata = { title: "Comercial" };

/** La ruta del mes: meta, ritmo, resultados clave y lo que Axi propone. */
export default function ComercialPage() {
  return <CommercialView />;
}
