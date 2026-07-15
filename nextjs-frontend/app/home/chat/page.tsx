'use client'

import {
  StrictMode,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { ErrorInfo } from 'react'

import "./index.css"

import { Button } from '@/../components/chat_components/ui/button'
import { Input } from '@/../components/chat_components/ui/input'

import { Plus, Trash2 } from 'lucide-react'

import { Toaster } from '@/../components/chat_components/ui/toaster'

import { ErrorBoundary } from '@/../components/chat_components/ErrorBoundary'
import { AppErrorFallback } from '@/../components/chat_components/fallbacks/AppErrorFallback'

import { submitQuery } from '@/api/rag/chat/chat-action'

import {
  ChatMessage,
  useStore,
} from '@/api/rag/chat/useStore'

import { limitConversationHistory } from '@/../components/chat_components/ChatInterfaceSimple'
import { Dashboard } from "@/../components/chat_components/Dashboard"
import { MarkdownContent } from "@/../components/chat_components/MarkdownContent"


type ActiveView = 'chat' | 'dashboard'

function App() {
  const {
    setLoading,
    addMessage,
    messages,
    isLoading,
    dashboardItems,
    setDashboardItems,
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
  } = useStore()

  const [activeView, setActiveView] = useState<ActiveView>('chat')
  const [input, setInput] = useState('')
  const [runError, setRunError] = useState<string | null>(null)

  const isMountedRef = useRef(false)

  // Create an initial session if none exist
  useEffect(() => {
    if (sessions.length === 0) {
      createSession()
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  const safeSetLoading = (loading: boolean) => {
    if (isMountedRef.current) setLoading(loading)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    if (!activeSessionId) createSession()

    setRunError(null)
    const userMessage = input.trim()
    setInput('')

    addMessage({ role: 'user', content: userMessage })
    safeSetLoading(true)

    try {
      const limitedMessages = limitConversationHistory(messages)
      const conversationHistory = limitedMessages
        .filter((msg: ChatMessage) => msg.role === 'user' || msg.role === 'assistant')
        .map((msg: ChatMessage) => ({ role: msg.role, content: msg.content }))

      const formData = new FormData()
      formData.append('query', JSON.stringify({ query: userMessage, history: conversationHistory }))

      const res = await submitQuery(formData)

      if (res?.ok === false) {
        setRunError(res.error ?? 'Query failed')
        addMessage({ role: 'assistant', content: 'Sorry, something went wrong while processing your request.' })
        return
      }

      addMessage({
        role: 'assistant',
        content: res.data?.answer ?? 'No response returned',
        sources: res.data?.sources ?? [],
      })

      if (res.data?.dashboard_list?.length) {
        setDashboardItems(res.data.dashboard_list)
      }
    } catch (error) {
      console.error('Failed to submit query:', error)
      setRunError('Unexpected error')
      addMessage({ role: 'assistant', content: 'An unexpected error occurred.' })
    } finally {
      safeSetLoading(false)
    }
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ backgroundColor: 'var(--theme-page-bg)', color: 'var(--theme-page-fg)' }}
    >
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{
          backgroundColor: 'var(--theme-panel-bg)',
          borderRight: '1px solid var(--theme-card-border)',
        }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid var(--theme-card-border)' }}>
          <button
            className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--theme-button-outline-bg)',
              color: 'var(--theme-button-outline-fg)',
              border: '1px solid var(--theme-button-outline-border)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-button-outline-hover-bg)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-button-outline-bg)')}
            onClick={() => { createSession(); setActiveView('chat') }}
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map(session => {
            const isActive = session.id === activeSessionId
            return (
              <div
                key={session.id}
                className="group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--theme-button-primary-bg)' : 'transparent',
                  color: isActive ? 'var(--theme-button-primary-fg)' : 'var(--theme-page-fg)',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'var(--theme-inner-panel-bg)'
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => { setActiveSession(session.id); setActiveView('chat') }}
              >
                <span className="flex-1 truncate">{session.title}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 flex-shrink-0 rounded p-0.5 transition-opacity"
                  style={{ color: isActive ? 'var(--theme-button-primary-fg)' : 'var(--theme-page-muted-fg)' }}
                  onClick={e => { e.stopPropagation(); deleteSession(session.id) }}
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header
          className="px-6 py-4 flex-shrink-0 flex items-center justify-end gap-2"
          style={{ borderBottom: '1px solid var(--theme-card-border)' }}
        >
          <button
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: activeView === 'chat' ? 'var(--theme-button-primary-bg)' : 'var(--theme-button-outline-bg)',
              color: activeView === 'chat' ? 'var(--theme-button-primary-fg)' : 'var(--theme-button-outline-fg)',
              border: `1px solid ${activeView === 'chat' ? 'var(--theme-button-primary-border)' : 'var(--theme-button-outline-border)'}`,
            }}
            onClick={() => setActiveView('chat')}
          >
            Chat
          </button>

          <button
            className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
            style={{
              backgroundColor: activeView === 'dashboard' ? 'var(--theme-button-primary-bg)' : 'var(--theme-button-outline-bg)',
              color: activeView === 'dashboard' ? 'var(--theme-button-primary-fg)' : 'var(--theme-button-outline-fg)',
              border: `1px solid ${activeView === 'dashboard' ? 'var(--theme-button-primary-border)' : 'var(--theme-button-outline-border)'}`,
            }}
            onClick={() => setActiveView('dashboard')}
            disabled={dashboardItems.length === 0}
          >
            Dashboard
            {dashboardItems.length > 0 && (
              <span
                className="ml-1 text-xs rounded-full px-1.5"
                style={{
                  backgroundColor: 'var(--theme-button-primary-fg)',
                  color: 'var(--theme-button-primary-bg)',
                }}
              >
                {dashboardItems.length}
              </span>
            )}
          </button>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto px-6 py-4">
          {activeView === 'chat' ? (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((message: ChatMessage, index: number) => (
                <div
                  key={message.id ?? index}
                  className="rounded-lg p-4 max-w-[80%]"
                  style={
                    message.role === 'user'
                      ? {
                          marginLeft: 'auto',
                          backgroundColor: 'var(--theme-button-primary-bg)',
                          color: 'var(--theme-button-primary-fg)',
                        }
                      : {
                          backgroundColor: 'var(--theme-inner-panel-bg)',
                          color: 'var(--theme-page-fg)',
                        }
                  }
                >
                  <MarkdownContent content={message.content} />

                  {Array.isArray(message.sources) && message.sources.length > 0 && (
                    <div
                      className="mt-2 text-xs italic"
                      style={{ color: 'var(--theme-page-muted-fg)' }}
                    >
                      {message.sources[0]}
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div
                  className="rounded-lg p-4 max-w-[80%]"
                  style={{ backgroundColor: 'var(--theme-inner-panel-bg)', color: 'var(--theme-page-muted-fg)' }}
                >
                  Running...
                </div>
              )}

              {runError && (
                <div className="px-2 py-1 text-sm" style={{ color: '#dc2626' }}>
                  {runError}
                </div>
              )}
            </div>
          ) : (
            <Dashboard items={dashboardItems} />
          )}
        </main>

        {/* Footer — chat view only */}
        {activeView === 'chat' && (
          <footer
            className="p-4"
            style={{ borderTop: '1px solid var(--theme-card-border)' }}
          >
            <div className="max-w-4xl mx-auto flex gap-2">
              <input
                className="flex-1 rounded-md px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--theme-input-bg)',
                  color: 'var(--theme-input-fg)',
                  border: '1px solid var(--theme-input-border)',
                }}
                value={input}
                placeholder="Ask something..."
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
                onFocus={e => (e.currentTarget.style.boxShadow = `0 0 0 2px var(--theme-input-focus-ring)`)}
                onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
              />

              <button
                className="rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--theme-button-primary-bg)',
                  color: 'var(--theme-button-primary-fg)',
                  border: '1px solid var(--theme-button-primary-border)',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-button-primary-hover-bg)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-button-primary-bg)')}
                onClick={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Running...' : 'Send'}
              </button>
            </div>
          </footer>
        )}
      </div>

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
