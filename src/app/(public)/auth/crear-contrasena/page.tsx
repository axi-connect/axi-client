import type { Metadata } from "next"

import { noindexMetadata } from "@/core/seo/metadata"
import { SetPasswordFlow } from "@/modules/password/ui/SetPasswordFlow"

/**
 * `/auth/crear-contrasena#token=…` — enlace de invitación del correo de
 * bienvenida (72 h, un solo uso). Pública por el prefijo `/auth`. El token va en
 * el `#`: nunca llega al servidor de Next ni a los logs, y la vista lo borra de
 * la URL al leerlo. `Referrer-Policy: no-referrer` en `next.config.ts`.
 */
export const metadata: Metadata = noindexMetadata("Crea tu contraseña")

export default function CrearContrasenaPage() {
  return <SetPasswordFlow purpose="invite" />
}
