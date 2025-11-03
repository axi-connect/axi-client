import InboxList from "../components/InboxList"

export default function InboxSidebar() {
    return (
        <div className="h-full w-[21rem] shrink-0 bg-background border-r border-t border-border">
            <InboxList />
        </div>
    )
}