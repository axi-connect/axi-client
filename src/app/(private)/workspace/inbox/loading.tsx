import { InboxSkeleton } from "@/shared/components/features/loading"

export default function InboxLoading() {
  // El skeleton mide lo mismo que el contenido que reemplaza porque reparte
  // igual (`min-h-0 flex-1`), no porque copie una altura. Restarla a mano
  // (antes `calc(100vh-4rem)`) daba un salto al hidratar, y un `h-full` contra
  // un padre `auto` dejaba el scroll en el panel — DESIGN-SYSTEM §4.2.
  return <InboxSkeleton />
}
