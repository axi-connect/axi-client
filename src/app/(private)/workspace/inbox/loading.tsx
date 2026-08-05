import { InboxSkeleton } from "@/shared/components/features/loading"

export default function InboxLoading() {
  // h-full: el skeleton mide lo mismo que el contenido que reemplaza. Antes
  // era calc(100vh-4rem), que además de restar a mano usaba otro número (64px)
  // que el resto del shell (52px) → salto visible al hidratar.
  return <InboxSkeleton className="h-full" />
}
