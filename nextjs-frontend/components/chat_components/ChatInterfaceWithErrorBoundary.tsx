import React from 'react'
import type { ErrorInfo } from 'react'

import { ChatErrorFallback } from './fallbacks/ChatErrorFallback'
import { ChatInterfaceSimple } from './ChatInterfaceSimple'
import { ErrorBoundary } from '@/components/chat_components/ErrorBoundary'

function ChatInterfaceWrapper({ children }: { children: React.ReactNode }) {
  const handleChatError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Chat interface error boundary triggered:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    })
  }

  return (
    <ErrorBoundary
      fallback={ChatErrorFallback}
      onError={handleChatError}
      enableRetry={true}
      errorBoundaryKey="chat-interface"
    >
      {children}
    </ErrorBoundary>
  )
}

export function ChatInterfaceWithErrorBoundary() {
  return (
    <ChatInterfaceWrapper>
      <ChatInterfaceSimple />
    </ChatInterfaceWrapper>
  )
}
