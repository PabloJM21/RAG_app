'use client'

import {
  StrictMode,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { ErrorInfo } from 'react'

import "./index.css"

import { Button } from '@/components/chat_components/ui/button'
import { Input } from '@/components/chat_components/ui/input'

import { Sun, Moon } from 'lucide-react'

import { Toaster } from '@/components/chat_components/ui/toaster'

import { ErrorBoundary } from '@/components/chat_components/ErrorBoundary'
import { AppErrorFallback } from '@/components/chat_components/fallbacks/AppErrorFallback'

import { submitQuery } from '@/api/rag/chat/chat-action'

import {
  ChatMessage,
  useStore,
} from '@/api/rag/chat/useStore'

import { limitConversationHistory } from '@/components/chat_components/ChatInterfaceSimple'
import {Dashboard} from "@/components/chat_components/Dashboard";


type ActiveView = 'chat' | 'dashboard'

function App() {
  const {
    isDarkMode,
    toggleTheme,
    setLoading,
    addMessage,
    messages,
    isLoading,
    dashboardItems,       // ✅ add
    setDashboardItems,    // ✅ add
  } = useStore()

  const [activeView, setActiveView] = useState<ActiveView>('chat')
  const [input, setInput] = useState('')
  const [runError, setRunError] = useState<string | null>(null)

  const isMountedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const safeSetLoading = (loading: boolean) => {
    if (isMountedRef.current) {
      setLoading(loading)
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()

    if (!input.trim() || isLoading) return

    setRunError(null)

    const userMessage = input.trim()
    setInput('')

    addMessage({
      role: 'user',
      content: userMessage,
    })

    safeSetLoading(true)

    try {
      const limitedMessages = limitConversationHistory(messages)

      const conversationHistory = limitedMessages
        .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: ChatMessage) => ({
          role: msg.role,
          content: msg.content,
        }))

      const formData = new FormData()
      formData.append(
        'query',
        JSON.stringify({
          query: userMessage,
          history: conversationHistory,
        })
      )

      const res = await submitQuery(formData)

      if (res?.ok === false) {
        setRunError(res.error ?? 'Query failed')

        addMessage({
          role: 'assistant',
          content: 'Sorry, something went wrong while processing your request.',
        })

        return
      }

      addMessage({
        role: 'assistant',
        content: res.data?.answer ?? 'No response returned',
        sources: res.data?.sources ?? [],
      })
      // ✅ Store dashboard data so button activates
      if (res.data?.dashboard_list?.length) {
        setDashboardItems(res.data.dashboard_list)
      }
    } catch (error) {
      console.error('Failed to submit query:', error)

      setRunError('Unexpected error')

      addMessage({
        role: 'assistant',
        content: 'An unexpected error occurred.',
      })
    } finally {
      safeSetLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Simple MCP Client</h1>

            <img
              src="/images/manuchi-chat-2218345.jpg"
              alt="Chat Logo"
              className="h-8 w-auto"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <Button
              variant={activeView === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('chat')}
            >
              Chat
            </Button>

            <Button
              variant={activeView === 'dashboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('dashboard')}
              disabled={dashboardItems.length === 0} // will enable once items arrive
            >
              Dashboard
              {dashboardItems.length > 0 && (
                <span className="ml-1 text-xs bg-primary-foreground text-primary rounded-full px-1.5">
                  {dashboardItems.length}
                </span>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-6 py-4">
        {activeView === 'chat' ? (
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map((message: ChatMessage, index: number) => (
              <div
                key={message.id ?? index}
                className={`rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-auto max-w-[80%]'
                    : 'bg-muted max-w-[80%]'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {Array.isArray(message.sources) && message.sources.length > 0 && (
                  <div className="mt-3 border-t pt-3 text-sm">
                    <p className="font-medium mb-1">Sources</p>

                    <ul className="space-y-1">
                      {message.sources.map((source, idx) => (
                        <li key={idx}>
                          {typeof source === 'string'
                            ? source
                            : JSON.stringify(source)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="bg-muted rounded-lg p-4 max-w-[80%]">Running...</div>
            )}

            {runError && (
              <div className="px-2 py-1 text-sm text-red-600">{runError}</div>
            )}
          </div>
        ) : (
          <Dashboard items={dashboardItems} />
        )}
      </main>

      {/* Footer only in chat view */}
      {activeView === 'chat' && (
        <footer className="border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask something..."
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
            />

            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Running...' : 'Send'}
            </Button>
          </div>
        </footer>
      )}

      <Toaster />
    </div>
  )
}

export default function Page() {
  const handleAppError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Application-level error boundary triggered:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <StrictMode>
      <ErrorBoundary
        fallback={AppErrorFallback}
        onError={handleAppError}
        enableRetry={true}
        errorBoundaryKey="app-level"
      >
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
}
