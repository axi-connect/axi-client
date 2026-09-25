import type { Metadata } from "next"

import { ChangePasswordCard } from "@/modules/password/ui/ChangePasswordCard"
import { PageHeader } from "@/shared/components/layout/page-header"

export const metadata: Metadata = { title: "Mi cuenta" }

/**
 * `/cuenta` — lo que cada usuario gestiona de SU acceso, sea cual sea su rol.
 * No hay pantalla de perfil en el panel; esta es la primera pieza (hoy solo
 * «Cambiar contraseña»). Se entra desde el menú de cuenta del pie del sidebar.
 */
export default function CuentaPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Mi cuenta" description="Tu acceso al panel." />
      <ChangePasswordCard />
    </div>
  )
}
