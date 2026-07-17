import type { Metadata } from "next";
import { PlatformProviders } from "@/modules/platform/ui/providers/PlatformProviders";

export const metadata: Metadata = {
  title: "Consola de Plataforma — Axi Connect",
  description: "Panel interno de administración de la plataforma axi.",
  robots: { index: false, follow: false },
};

/**
 * Raíz de la consola de plataforma (/platform/*). Monta los providers
 * propios (QueryClient dedicado + sesión de super admin) para TODO el árbol,
 * incluido el login. El shell y el guard viven en el grupo (admin).
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformProviders>{children}</PlatformProviders>;
}
