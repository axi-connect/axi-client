import { create } from 'zustand'
import { Message } from '../../domain/message'
import type { ConversationDto, ConversationSearchCriteria } from "../../domain/conversation"
import { getConversations } from "../services/conversations-service.adapter"

type ConversationStore = {
  loading: boolean
  error: Error | null
  conversations: ConversationDto[]
  selectedConversation: ConversationDto | null
  setSelectedConversation: (conversation: ConversationDto) => void
  fetchConversations: (params?: ConversationSearchCriteria) => Promise<void>
  updateLastMessage: (conversationId: string, message: Partial<Message>) => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
    error: null,
    loading: true,
    conversations: [],
    selectedConversation: null,
    setSelectedConversation: (conversation: ConversationDto) => set({ selectedConversation: conversation }),
    fetchConversations: async (params?: ConversationSearchCriteria) => {
        set({ loading: true })
        try {
            const { data } = await getConversations(params ?? {})
            set({ conversations: data })
        } catch (error) {
            set({ error: error instanceof Error ? error : new Error("Error desconocido") })
        } finally {
            set({ loading: false })
        }
    },
    updateLastMessage: async (conversationId: string, message: Partial<Message>) => {
        // Si la conversación no existe, se consulta la API para obtenerla
        const conversations = get().conversations
        const conversation = conversations.find((conversation: ConversationDto) => conversation.id === conversationId)
        if(!conversation) {
            const { data } = await getConversations({ id: conversationId })
            if(!data?.[0]) return
            set({ conversations: [data[0],...conversations] })
        }

        // Si existe, se actualiza el último mensaje
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