import { create } from 'zustand'
import { Message } from '../../domain/message'
import { AgentDetailDTO } from '@/modules/agents/domain/agent'
import { getConversations } from "../services/conversations-service.adapter"
import { getMessagesByConversation } from "../services/messages-service.adapter"
import type { ConversationDto, ConversationSearchCriteria } from "../../domain/conversation"

type ConversationStore = {
  loading: boolean
  error: Error | null
  messages: Message[]
  loadingMessages: boolean
  conversations: ConversationDto[]
  selectedConversation: ConversationDto | null
  fetchMessages: (conversationId: string) => Promise<void>
  setSelectedConversation: (conversation: ConversationDto) => void
  fetchConversations: (params?: ConversationSearchCriteria) => Promise<void>
  updateLastMessage: (conversationId: string, message: Message) => void
  assignAgent: (conversationId: string, agent: AgentDetailDTO) => void
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
    error: null,
    messages: [],
    loading: true,
    conversations: [],
    loadingMessages: false,
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
    fetchMessages: async (conversationId: string) => {
        set({ loadingMessages: true })
        try {
            const { data } = await getMessagesByConversation(conversationId)
            set({ messages: data })
        } finally {
            set({ loadingMessages: false })
        }
    },
    updateLastMessage: async (conversationId: string, message: Message) => {
        // Si la conversación no existe, se consulta la API para obtenerla
        const conversations = get().conversations
        const conversation = conversations.find((conversation: ConversationDto) => conversation.id === conversationId)
        if(!conversation) {
            const { data } = await getConversations({ id: conversationId })
            if(!data?.[0]) return
            set({ conversations: [data[0],...conversations] })
        }

        // Si existe, se actualiza el último mensaje
        const created_at = new Date(message.created_at)
        set((state) => ({
            conversations: state.conversations.map((conversation) => {
                if (conversation.id === conversationId) {
                    return { 
                        ...conversation, 
                        last_message: { 
                            id: message.id, 
                            message: message.message, 
                            created_at: created_at.toISOString()
                        } 
                    } as ConversationDto
                }
                return conversation
            }).sort((a, b) => {
                return new Date(b.last_message?.created_at || 0).getTime() - new Date(a.last_message?.created_at || 0).getTime()
            })
        }))

        // Se agrega el nuevo mensaje al array de mensajes
        set((state) => ({
            messages: [...state.messages, {...message, created_at: created_at}]
        }))
    },
    assignAgent: async (conversationId: string, agent: AgentDetailDTO) => {
        set({ conversations: get().conversations.map((conversation) => {
            if (conversation.id === conversationId) return { 
                ...conversation, 
                assigned_agent: { 
                    name: agent.name,
                    id: String(agent.id),
                    avatar: agent.character.avatar_url
                }
            }
            return conversation
        }) })
    }
}))