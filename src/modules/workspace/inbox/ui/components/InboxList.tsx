"use client"

import Image from "next/image"
import { Fragment, useEffect, useState } from "react"
import { icons } from "@/core/lib/icons"
// import { useRouter } from "next/navigation"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import InboxItem, { InboxItemSkeleton } from "./InboxItem"
import { ButtonGroup } from "@/shared/components/ui/button-group"
import { ConversationDto } from "@/modules/conversations/domain/conversation"
import { useConversationStore } from "@/modules/conversations/infrastructure/store/conversations.store"
import { MessageSquare, MessageSquareDot, MessageSquareOff, MessageSquareText, MoreHorizontalIcon, SearchIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu"

type Status = "all" | "open" | "closed" | "pending"

// Datos para el filtro por estado de la conversación
const conversationStatusData: Record<Status, { value: Status, label: string, icon: React.ElementType }> = {
  all: {
    value: "all",
    label: "Todas",
    icon: MessageSquare
  },
  open: {
    value: "open",
    label: "Abiertas",
    icon: MessageSquareText
  },
  closed: {
    value: "closed",
    label: "Cerradas",
    icon: MessageSquareOff
  },
  pending: {
    value: "pending",
    label: "Pendientes",
    icon: MessageSquareDot
  }
}

// Componente para filtrar por estado de la conversación
function ConversationStatusFilter({ status, isActive, setStatus }: { status: Status, isActive: boolean, setStatus: (status: Status) => void }) {
  const Icon = conversationStatusData[status].icon
  const label = conversationStatusData[status].label
  return (
    <Button 
      size="sm"
      onClick={() => setStatus(status)}
      variant={isActive ? "ghost" : "secondary"} 
      className={isActive ? "bg-background" : "bg-secondary"}
    >
      <Icon />
      <span>{label}</span>
    </Button>
  )
}

function InboxListEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <Image src={icons.MESSAGE} alt="Message" width={100} height={100} />
      <h1 className="text-2xl font-bold text-center mt-4">Aún no hay conversaciones</h1>
      <p className="text-sm text-muted-foreground text-center">Cuando tengas conversaciones, aparecerán aquí.</p>
    </div>
  )
}

function InboxListLoading() {
  return (
    <div className="flex flex-col [mask-image:linear-gradient(to_bottom,black,transparent)]">
      {Array.from({ length: 5 }).map((_, index) => <InboxItemSkeleton key={index} />)}
    </div>
  )
}

export default function InboxList() {
  // const router = useRouter()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<Status>("all")
  const [statusFilter, setStatusFilter] = useState<Status>("open")
  const {conversations, loading, fetchConversations, setSelectedConversation} = useConversationStore()

  useEffect(() => {
    console.log(conversations);
  }, [conversations]);

  useEffect(() => void fetchConversations(), [fetchConversations]);

  const handleClick = (conversation: ConversationDto) => {
    setSelectedConversation(conversation);
    // router.push(`/workspace/inbox/${conversation.id}`);
  }

  const handleStatusFilter = (status: Status) => {
    if(status !== "all") setStatusFilter(status);
    setStatus(status);
    fetchConversations({ status });
  }

  return (
    <div className="h-full">
      <div className="p-4 flex flex-col gap-4">
        <Input
          type="search"
          value={search}
          className="w-full"
          placeholder="Buscar conversación"
          onChange={(e) => setSearch(e.target.value)}
          prefix={<SearchIcon className="size-4 shrink-0 opacity-50" /> as unknown as string}
        />
        <ButtonGroup className="self-center flex justify-center p-1 bg-muted rounded-lg">
          <ConversationStatusFilter status="all" isActive={status === "all"} setStatus={handleStatusFilter} />
          <ConversationStatusFilter status={statusFilter} isActive={status !== "all"} setStatus={handleStatusFilter} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm">
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {Object.values(conversationStatusData).map((status, index) => (
                <Fragment key={status.label}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem className="flex items-center gap-2" onClick={() => handleStatusFilter(status.value)}>
                    <status.icon size={16}/>
                    <span>{status.label}</span>
                  </DropdownMenuItem>
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ButtonGroup>
      </div> 
      
      <div className="overflow-y-auto h-[calc(100vh-176px)] sidebar-scroll">
        {
          loading 
          ? <InboxListLoading /> 
          : conversations.length === 0 
          ? <InboxListEmpty /> 
          : conversations.map((conversation) => (
            <InboxItem 
              data={conversation}
              key={conversation.id}
              onClick={() => handleClick(conversation)}
            />
          ))
        }
      </div>
    </div>
  )
}