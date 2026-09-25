import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"
import { ForgotPasswordView } from "@/modules/password/ui/ForgotPasswordView"

/** `/auth/olvide-contrasena` — pide el enlace para crear una contraseña nueva. */
export const metadata: Metadata = noindexMetadata("¿Olvidaste tu contraseña?")

export default function OlvideContrasenaPage() {
  return <ForgotPasswordView />
}
