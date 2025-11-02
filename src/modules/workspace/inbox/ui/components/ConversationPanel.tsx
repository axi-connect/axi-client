"use client"

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { icons } from "@/core/lib/icons";
import Conversation1 from "./conversation1"
import { useEffect, useState } from "react";
import { Message } from "@/modules/conversations/domain/message";
import { useConversationStore } from "@/modules/conversations/infrastructure/store/conversations.store"
import { getMessagesByConversation } from "@/modules/conversations/infrastructure/services/messages-service.adapter";

export default function ConversationPanel() {
    const [loading, setLoading] = useState(false);
    const { selectedConversation } = useConversationStore()
    const [messages, setMessages] = useState<Message[]>([]);
    const [conversationId, setConversationId] = useState<string | undefined>(selectedConversation?.id);

    useEffect(() => {
        if (selectedConversation && selectedConversation.id !== conversationId) {
            setLoading(true);
            getMessagesByConversation(selectedConversation.id).then((res) => {
                setMessages(res.data);
                setConversationId(selectedConversation.id);
            }).finally(() => {
                setLoading(false);
            });
        }
    }, [selectedConversation, conversationId]);

    if (!selectedConversation) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full p-4">
                <Image src={icons.MESSAGE} alt="Message" width={100} height={100} />
                <h1 className="text-2xl font-bold text-center mt-4">Aún no hay conversaciones</h1>
                <p className="text-sm text-muted-foreground text-center">Cuando tengas conversaciones, aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <main className="flex flex-col h-full w-full">
            <div className="bg-background border-border border-y  p-4 flex gap-3 items-center">
                <Image
                    width={1080}
                    height={1080}
                    alt={selectedConversation.contact.name}
                    src={selectedConversation.contact.profile_pic_url}
                    className="rounded-xl size-12 object-cover outline-background outline-2"
                />
                <div>
                    <h1 className="text-lg font-semibold">
                        {selectedConversation.contact.name}
                    </h1>
                    <p className="text-sm">
                        {selectedConversation.contact.number}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-full w-full p-4">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <Conversation1 messages={messages} />
            )}

        </main>
    )
}

// card
// border-border bg-card w-full max-w-2xl overflow-hidden rounded-xl border shadow-lg