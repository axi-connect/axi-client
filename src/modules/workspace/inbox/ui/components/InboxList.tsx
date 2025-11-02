"use client"

import Image from "next/image";
import { useEffect } from "react";
import { icons } from "@/core/lib/icons";
import { useAuth } from "@/shared/auth/auth.hooks";
import InboxItem, { InboxItemSkeleton } from "./InboxItem";
import { useConversationStore } from "@/modules/conversations/infrastructure/store/conversations.store";

export default function InboxList() {
  const {} = useAuth()
  const {conversations, loading, fetchConversations} = useConversationStore()

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

  return (
    <div>
      {conversations.map((conversation) => (
        <InboxItem key={conversation.id} data={conversation} />
      ))}
    </div>
  )
}