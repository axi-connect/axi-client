"use client"

import Image from "next/image";
import { icons } from "@/core/lib/icons";
import { useEffect, useState } from "react";
import InboxItem, { InboxItemSkeleton } from "./InboxItem";
import { Conversation } from "@/modules/conversations/domain/conversation";
import { getConversations } from "@/modules/conversations/infrastructure/services/conversations-service.adapter";

export default function InboxList() {
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    setLoading(true);
    getConversations({}).then((response) => {
      setConversations(response.data);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    console.log(conversations);
  }, [conversations]);

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