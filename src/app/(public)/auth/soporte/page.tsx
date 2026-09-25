import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"
import { SupportRedeemFlow } from "@/modules/support-access/ui/SupportRedeemFlow"

/**
 * `/auth/soporte#code=…` — la pestaña que abre «Entrar como soporte» en la
 * consola (entrega F3). Pública por el prefijo `/auth`. El código va en el `#`
 * (nunca llega al servidor de Next ni a los logs) y la vista lo borra al
 * leerlo. `?fin=1`: la sesión de soporte terminó.
 */
export const metadata: Metadata = noindexMetadata("Soporte")

export default function SoportePage() {
  return <SupportRedeemFlow />
}
