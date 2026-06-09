// ChatInterfaceSimple.tsx

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import ReactMarkdown from 'react-markdown'

import {
  Loader2,
  Send,
  Trash2,
} from 'lucide-react'



import { Button } from './ui/button'
import { Textarea } from './ui/textarea'

import { useToast } from './ui/use-toast'
import {submitQuery} from "@/app/api/rag/chat/chat-action";
import {ChatMessage, useStore} from "@/app/api/rag/chat/useStore";

const MAX_CONVERSATION_HISTORY = 50

export const limitConversationHistory = (
    history: any[]
  ) => {
    if (
      history.length <=
      MAX_CONVERSATION_HISTORY
    ) {
      return history
    }

    return history.slice(
      -MAX_CONVERSATION_HISTORY
    )
  }

export function ChatInterfaceSimple() {
  const [input, setInput] = useState('')

  const messagesEndRef =
    useRef<HTMLDivElement>(null)

  const { toast } = useToast()

  const {
    messages,
    isLoading,
    addMessage,
    setLoading,
    clearMessages,
  } = useStore()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])



  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()

    setInput('')

    addMessage({
      role: 'user',
      content: userMessage,
    })

    setLoading(true)

    try {
      /**
       * Preserve chat history
       */
      const conversationHistory =
        limitConversationHistory(messages).map(
          (msg) => ({
            role: msg.role,
            content: msg.content,
          })
        )

      const formData = new FormData()

      formData.append(
        'query',
        JSON.stringify({
          query: userMessage,
          history: conversationHistory,
        })
      )

      const result = await submitQuery(formData)

      /**
       * API-level errors already normalized
       */
      if (result?.ok === false) {
        addMessage({
          role: 'assistant',
          content:
            result.error ||
            'Failed to get response',
        })

        toast({
          title: 'Chat Error',
          description:
            result.error ||
            'Failed to get response',
          variant: 'destructive',
        })

        return
      }

      addMessage({
        role: 'assistant',
        content:
          result?.data?.answer ||
          'No response returned.',
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unexpected error'

      addMessage({
        role: 'assistant',
        content:
          "I'm sorry, but something went wrong while processing your request.",
      })

      toast({
        title: 'Chat Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent
  ) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Start a conversation.
              </p>
            </div>
          ) : (
            messages.map((message: ChatMessage, index: number) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user'
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-transparent'
                  }`}
                >
                  {message.role ===
                  'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />

                  <span className="text-sm">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="max-w-4xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
              className="resize-none"
              rows={2}
            />

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                size="icon"
                disabled={
                  !input.trim() || isLoading
                }
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>

              {messages.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={clearMessages}
                  disabled={isLoading}
                  title="Clear chat"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}