import { create } from 'zustand'
import type { ConversationDto } from "../../domain/conversation"
import { getConversations } from "../services/conversations-service.adapter"
import { Message } from '../../domain/message'

type ConversationStore = {
  loading: boolean
  error: Error | null
  conversations: ConversationDto[]
  fetchConversations: () => Promise<void>
  selectedConversation: ConversationDto | null
  setSelectedConversation: (conversation: ConversationDto) => void
  updateLastMessage: (conversationId: string, message: Partial<Message>) => void
}

export const useConversationStore = create<ConversationStore>((set) => ({
    error: null,
    loading: true,
    conversations: [],
    selectedConversation: null,
    setSelectedConversation: (conversation: ConversationDto) => set({ selectedConversation: conversation }),
    fetchConversations: async () => {
        set({ loading: true })
        try {
            const { data } = await getConversations({})
            set({ conversations: data })
        } catch (error) {
            set({ error: error instanceof Error ? error : new Error("Error desconocido") })
        } finally {
            set({ loading: false })
        }
    },
    updateLastMessage: (conversationId: string, message: Partial<Message>) => {
        set((state) => ({
            conversations: state.conversations.map((conversation) => {
                if (conversation.id === conversationId) {
                    return { 
                        ...conversation, 
                        last_message: { 
                            id: message.id, 
                            message: message.message, 
                            created_at: message.created_at?.toISOString()
                        } 
                    } as ConversationDto
                }
                return conversation
            }).sort((a, b) => {
                return new Date(b.last_message?.created_at || 0).getTime() - new Date(a.last_message?.created_at || 0).getTime()
            })
        }))
    }
}))