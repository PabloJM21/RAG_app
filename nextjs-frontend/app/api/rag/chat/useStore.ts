import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// -----------------------------
// Types
// -----------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: any[]
  timestamp: string
}

export type NewMessage = Omit<ChatMessage, "id" | "timestamp">

export interface DashboardItem {
  project: string
  answer: string
  time: number
  score?: number
  metadata: {
    Chunk: string[]
    Document: string[]
    Level: string[]
    Number: (string | number)[]
  }
}

// -----------------------------
// Store Interface
// -----------------------------

interface ChatStore {
  // UI
  isDarkMode: boolean
  toggleTheme: () => void

  // Chat
  messages: ChatMessage[]
  isLoading: boolean
  addMessage: (message: NewMessage) => string
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void

  // Dashboard
  dashboardItems: DashboardItem[]
  setDashboardItems: (items: DashboardItem[]) => void
  clearDashboard: () => void
}

// -----------------------------
// Store Implementation
// -----------------------------

export const useStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // -----------------------------
      // UI State
      // -----------------------------
      isDarkMode: true,
      toggleTheme: () =>
        set((state) => ({ isDarkMode: !state.isDarkMode })),

      // -----------------------------
      // Chat State
      // -----------------------------
      messages: [],
      isLoading: false,

      addMessage: (message: NewMessage) => {
        const newMessage: ChatMessage = {
          ...message,
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
        }

        set((state) => ({
          messages: [...state.messages, newMessage],
        }))

        return newMessage.id
      },

      updateMessage: (messageId, updates) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg
          ),
        }))
      },

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => set({ messages: [] }),

      // -----------------------------
      // Dashboard State
      // -----------------------------
      dashboardItems: [],

      setDashboardItems: (items) => set({ dashboardItems: items }),

      clearDashboard: () => set({ dashboardItems: [] }),
    }),

    // -----------------------------
    // Persistence Config
    // -----------------------------
    {
      name: 'chat-client-storage',

      partialize: (state) => ({
        isDarkMode: state.isDarkMode,
        messages: state.messages,
        // dashboardItems intentionally NOT persisted
      }),
    }
  )
)
