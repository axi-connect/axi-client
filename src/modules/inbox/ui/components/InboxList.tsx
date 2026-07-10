"use client"

import { useEffect } from "react"
import { cn } from "@/core/lib/utils"
import { Inbox as InboxIcon } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { useInboxStore } from "@/modules/inbox/infrastructure/stores/inbox.store"
import {
  INBOX_TAB_LABELS,
  MODE_LABELS,
  type InboxConversation,
  type InboxTab,
} from "@/modules/inbox/domain/inbox"

/**
 * Lista de conversaciones operables con tabs (queued/mine/ai/all_open) y
 * badges en vivo desde `GET /inbox/counts` + eventos WS.
 */
function tabCount(tab: InboxTab, counts: ReturnType<typeof useInboxStore.getState>["counts"]): number | null {
  if (!counts) return null
  switch (tab) {
    case "queued": return counts.queued
    case "mine": return counts.mine
    case "ai": return counts.ai
    case "all_open": return counts.all_open
  }
}

function InboxItem({ conversation, active, onSelect }: {
  conversation: InboxConversation
  active: boolean
  onSelect: (id: string) => void
}) {
  const name = conversation.contact.full_name || conversation.contact.phone || "Sin nombre"
  const time = conversation.last_message_at
    ? new Date(conversation.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : ""

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left transition-colors",
        active ? "bg-accent" : "hover:bg-accent/50",
      )}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{time}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
          {conversation.last_message_preview ?? "…"}
        </span>
        <Badge
          variant={conversation.mode === "human_queued" ? "destructive" : conversation.mode === "human_active" ? "default" : "secondary"}
          className="shrink-0 text-[10px] px-1.5 py-0"
        >
          {MODE_LABELS[conversation.mode]}
        </Badge>
        {conversation.unread_count > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-white">
            {conversation.unread_count}
          </span>
        )}
      </div>
    </button>
  )
}

export function InboxList() {
  const { tab, setTab, conversations, loadingList, counts, selectedId, select, fetchConversations, fetchCounts } =
    useInboxStore()

  useEffect(() => {
    void fetchConversations(1)
    void fetchCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-r border-border bg-background/60">
      <div className="border-b border-border p-3">
        <h2 className="text-sm font-semibold">Inbox</h2>
        <div className="mt-2 flex gap-1" role="tablist" aria-label="Filtros del inbox">
          {(Object.keys(INBOX_TAB_LABELS) as InboxTab[]).map((tabOption) => {
            const count = tabCount(tabOption, counts)
            return (
              <button
                key={tabOption}
                role="tab"
                aria-selected={tab === tabOption}
                onClick={() => setTab(tabOption)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors",
                  tab === tabOption ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground/70 hover:bg-accent",
                )}
              >
                {INBOX_TAB_LABELS[tabOption]}
                {count !== null && count > 0 && <span className="font-semibold">{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {loadingList && conversations.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <InboxIcon className="size-8 opacity-40" />
            <p className="text-sm">No hay conversaciones en “{INBOX_TAB_LABELS[tab]}”</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <InboxItem
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === selectedId}
              onSelect={(id) => void select(id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
