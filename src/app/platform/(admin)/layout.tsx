import { PlatformGuard } from "@/modules/platform/ui/components/PlatformGuard";
import { PlatformShell } from "@/modules/platform/ui/components/PlatformShell";

/**
 * Árbol autenticado de la consola (/platform/*, salvo login): guard binario
 * client-side (el token vive en sessionStorage, el edge no puede validarlo)
 * + shell propio. Los providers ya están montados en el layout raíz.
 */
export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlatformGuard>
      <PlatformShell>{children}</PlatformShell>
    </PlatformGuard>
  );
}
