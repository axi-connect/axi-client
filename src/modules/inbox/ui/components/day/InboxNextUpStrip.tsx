"use client"

import { cn } from "@/core/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Island } from "@/shared/components/features/island"
import type { InboxConversation } from "@/modules/inbox/domain/inbox"
import { firstNameOf } from "@/modules/inbox/domain/inbox-summary"
import type { InboxCommands } from "@/modules/inbox/infrastructure/realtime/use-inbox-socket"
import { useInboxDayIfMounted } from "@/modules/inbox/infrastructure/stores/inbox-day.context"
import { useMinuteTick } from "@/modules/inbox/ui/hooks/use-minute-tick"
import { sinceLabel } from "./since-label"
import { useClaimNext } from "./use-claim-next"

/**
 * «Lo próximo» en el celular (<md), donde no hay panel para «Tu día»: una franja
 * de cristal arriba de la lista con quién espera más y «Atender». Sin cola no
 * se pinta: la lista ya dice «Nadie espera».
 */
export function InboxNextUpStrip({ commands, className }: { commands?: InboxCommands; className?: string }) {
  const head = useInboxDayIfMounted()?.head ?? null
  if (head === null) return null
  return <Strip head={head} commands={commands} className={className} />
}

function Strip({ head, commands, className }: { head: InboxConversation; commands?: InboxCommands; className?: string }) {
  const now = useMinuteTick()
  const claim = useClaimNext(commands)

  const name = head.contact.full_name || head.contact.phone || "Sin nombre"
  const since = sinceLabel(head.queued_at ?? head.last_inbound_at, now)

  return (
    <Island as="section" aria-label="Lo próximo" className={cn("flex items-center gap-3 rounded-[20px] py-3 pr-3 pl-4", className)}>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="text-[10.5px] font-medium tracking-[0.12em] uppercase opacity-70">Lo próximo</p>
        <p className="truncate text-sm font-semibold" title={name}>
          {since === null ? firstNameOf(name) : `${firstNameOf(name)} · ${since}`}
        </p>
      </div>
      <Button variant="contrast" className="h-11 shrink-0 px-5" disabled={claim.busy} onClick={() => void claim.run(head)}>
        {claim.canClaim ? "Atender" : "Abrir"}
      </Button>
    </Island>
  )
}
