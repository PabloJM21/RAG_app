import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'





export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  timestamp: Date
}


export type NewMessage = Omit<ChatMessage, "id" | "timestamp">


interface ChatStore {
  // UI State
  isDarkMode: boolean
  toggleTheme: () => void

  // Chat State
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (message: NewMessage) => string
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void

}

export const useStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // UI State
      isDarkMode: true,
      toggleTheme: () => set((state: ChatStore) => ({ isDarkMode: !state.isDarkMode })),

      // Chat State (not persisted)
      messages: [],
      isLoading: false,
      addMessage: (message: NewMessage) => {
        const newMessage: ChatMessage = {
          ...message,
          id: crypto.randomUUID ? crypto.randomUUID() : `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        }
        set((state: ChatStore) => ({ messages: [...state.messages, newMessage] }))
        return newMessage.id
      },
      updateMessage: (messageId: string, updates: Partial<ChatMessage>) => {
        set((state: ChatStore) => ({
          messages: state.messages.map((msg: ChatMessage) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          )
        }))
      },
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      clearMessages: () => set({ messages: [] }),

    }),
    {
      name: 'chat-client-storage',
      partialize: (state: ChatStore) => ({
        isDarkMode: state.isDarkMode,
        // Don't persist messages, servers, or configs - they should be fetched fresh
      }),
    }
  )
)