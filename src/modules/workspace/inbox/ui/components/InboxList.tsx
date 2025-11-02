"use client"

import Image from "next/image"
import { useEffect } from "react"
import { icons } from "@/core/lib/icons"
// import { useRouter } from "next/navigation"
import { useAuth } from "@/shared/auth/auth.hooks"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import InboxItem, { InboxItemSkeleton } from "./InboxItem"
import { ButtonGroup } from "@/shared/components/ui/button-group"
import { ConversationDto } from "@/modules/conversations/domain/conversation"
import { CheckIcon, ClockIcon, MoreHorizontalIcon, XCircleIcon } from "lucide-react"
import { useConversationStore } from "@/modules/conversations/infrastructure/store/conversations.store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

export default function InboxList() {
  const {} = useAuth()
  // const router = useRouter()
  const {conversations, loading, fetchConversations, setSelectedConversation} = useConversationStore()

  useEffect(() => {
    console.log(conversations);
  }, [conversations]);

  useEffect(() => void fetchConversations(), [fetchConversations]);

  if (loading) {
    return (
      <div className="flex flex-col [mask-image:linear-gradient(to_bottom,black,transparent)]">
        {Array.from({ length: 8 }).map((_, index) => <InboxItemSkeleton key={index} />)}
      </div>
    )
  }

  if(conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Image src={icons.MESSAGE} alt="Message" width={100} height={100} />
        <h1 className="text-2xl font-bold text-center mt-4">Aún no hay conversaciones</h1>
        <p className="text-sm text-muted-foreground text-center">Cuando tengas conversaciones, aparecerán aquí.</p>
      </div>
    );
  }

  const handleClick = (conversation: ConversationDto) => {
    setSelectedConversation(conversation);
    // router.push(`/workspace/inbox/${conversation.id}`);
  }

  return (
    <div className="h-full">
      <ButtonGroup className="flex justify-end w-full">
        <Button variant="ghost" size="sm" className="ml-auto">
          <CheckIcon />
          <span>En Curso</span>
          <Badge variant="secondary" className="ml-auto font-mono">1</Badge>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" aria-label="More Options">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="flex items-center gap-2">
              <ClockIcon size={16} />
              En Seguimiento
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex items-center gap-2">
              <XCircleIcon size={16} />
              Cliente Cerrado
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      
      <div className="overflow-y-auto">
        {conversations.map((conversation) => (
          <InboxItem 
            data={conversation}
            key={conversation.id} 
            onClick={() => handleClick(conversation)} 
          />
        ))}
      </div>
    </div>
  )
}