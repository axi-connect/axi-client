import InboxSidebar from "@/modules/workspace/inbox/ui/sidebar/InboxSidebar"
import ConversationPanel from "@/modules/workspace/inbox/ui/components/ConversationPanel"

export default function WorkspaceInboxPage() {
    return (
        <div className="flex w-full h-full">
            <InboxSidebar />
            <ConversationPanel />
        </div>
    )
}   