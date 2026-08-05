import { InboxView } from "@/modules/inbox/ui/InboxView"

export default function WorkspaceInboxPage() {
  // Sin wrapper: `InboxView` es directamente el ítem flex del shell del
  // workspace y reparte con `flex-1`. Un `<div className="h-full">` intermedio
  // resolvía a `auto` y devolvía el scroll al panel (DESIGN-SYSTEM §4.2).
  return <InboxView />
}
