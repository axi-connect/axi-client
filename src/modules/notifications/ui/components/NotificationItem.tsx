"use client"

import { relativeTime } from "@/core/lib/relative-time"
import { cn } from "@/core/lib/utils"
import type { NotificationDTO } from "@/modules/notifications/domain/notification"

type NotificationItemProps = {
  notification: NotificationDTO
  onSelect: (notification: NotificationDTO) => void
}

export function NotificationItem({ notification, onSelect }: NotificationItemProps) {
  const unread = notification.read_at === null

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
    >
      <span
        aria-hidden
        className={cn(
          "mt-1.5 size-2 shrink-0 rounded-full",
          unread ? "bg-primary" : "bg-transparent",
        )}
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className={cn("block truncate text-sm", unread ? "font-medium" : "font-normal")}>
          {notification.title}
        </span>
        {notification.body && (
          <span className="line-clamp-2 block text-xs text-muted-foreground">
            {notification.body}
          </span>
        )}
      </span>
      <time
        dateTime={notification.created_at}
        title={new Date(notification.created_at).toLocaleString("es")}
        className="shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground"
      >
        {relativeTime(notification.created_at)}
      </time>
    </button>
  )
}
