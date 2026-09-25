import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"
import { SetPasswordFlow } from "@/modules/password/ui/SetPasswordFlow"

/**
 * `/auth/restablecer#token=…` — enlace del correo de «¿Olvidaste tu
 * contraseña?» (1 h, un solo uso). Mismo recorrido que crear contraseña, con el
 * copy de copy-v2 §4.3.
 */
export const metadata: Metadata = noindexMetadata("Crea una contraseña nueva")

export default function RestablecerPage() {
  return <SetPasswordFlow purpose="reset" />
}
