import { InboxView } from "@/modules/inbox/ui/InboxView"

/** Deep-link a una conversación: selecciona, hace join y marca leída. */
export default async function WorkspaceInboxConversationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="h-[calc(100vh-4rem)]">
      <InboxView initialConversationId={id} />
    </div>
  )
}
