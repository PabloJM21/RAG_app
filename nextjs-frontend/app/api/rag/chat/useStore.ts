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

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
}

// -----------------------------
// Store Interface
// -----------------------------

interface ChatStore {
  // UI
  isDarkMode: boolean
  toggleTheme: () => void

  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null
  createSession: () => string
  deleteSession: (sessionId: string) => void
  setActiveSession: (sessionId: string) => void

  // Chat (operates on active session)
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
// Helpers
// -----------------------------

function newSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
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
      // Session State
      // -----------------------------
      sessions: [],
      activeSessionId: null,

      createSession: () => {
        const id = newSessionId()
        const session: ChatSession = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
          messages: [],
          dashboardItems: [],
        }))
        return id
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const remaining = state.sessions.filter(s => s.id !== sessionId)
          const newActiveId =
            state.activeSessionId === sessionId
              ? (remaining[0]?.id ?? null)
              : state.activeSessionId
          const newMessages = remaining.find(s => s.id === newActiveId)?.messages ?? []
          return {
            sessions: remaining,
            activeSessionId: newActiveId,
            messages: newMessages,
            dashboardItems: state.activeSessionId === sessionId ? [] : state.dashboardItems,
          }
        })
      },

      setActiveSession: (sessionId) => {
        set((state) => ({
          activeSessionId: sessionId,
          messages: state.sessions.find(s => s.id === sessionId)?.messages ?? [],
          dashboardItems: [],
        }))
      },

      // -----------------------------
      // Chat State (proxied to active session)
      // -----------------------------
      isLoading: false,

      // messages is a derived value — components should use selectMessages(useStore.getState())
      // We expose it as a plain field that gets synced via the store's own state shape.
      // The actual source of truth is sessions[activeSessionId].messages.
      messages: [],

      addMessage: (message: NewMessage) => {
        const newMessage: ChatMessage = {
          ...message,
          id:
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          timestamp: new Date().toISOString(),
        }

        set((state) => {
          const { activeSessionId, sessions } = state
          if (!activeSessionId) return {}
          const updatedSessions = sessions.map(s => {
            if (s.id !== activeSessionId) return s
            const updatedMessages = [...s.messages, newMessage]
            // Auto-title the session from the first user message
            const title =
              s.title === 'New Chat' && message.role === 'user'
                ? message.content.slice(0, 40) + (message.content.length > 40 ? '…' : '')
                : s.title
            return { ...s, messages: updatedMessages, title }
          })
          const activeSession = updatedSessions.find(s => s.id === activeSessionId)
          return { sessions: updatedSessions, messages: activeSession?.messages ?? [] }
        })

        return newMessage.id
      },

      updateMessage: (messageId, updates) => {
        set((state) => {
          const { activeSessionId, sessions } = state
          if (!activeSessionId) return {}
          const updatedSessions = sessions.map(s =>
            s.id !== activeSessionId
              ? s
              : {
                  ...s,
                  messages: s.messages.map(msg =>
                    msg.id === messageId ? { ...msg, ...updates } : msg
                  ),
                }
          )
          const activeSession = updatedSessions.find(s => s.id === activeSessionId)
          return { sessions: updatedSessions, messages: activeSession?.messages ?? [] }
        })
      },

      setLoading: (loading) => set({ isLoading: loading }),

      clearMessages: () => {
        set((state) => {
          const { activeSessionId, sessions } = state
          if (!activeSessionId) return {}
          return {
            sessions: sessions.map(s =>
              s.id === activeSessionId ? { ...s, messages: [] } : s
            ),
            messages: [],
          }
        })
      },

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
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        messages: state.messages,
        // dashboardItems intentionally NOT persisted
      }),
    }
  )
)
