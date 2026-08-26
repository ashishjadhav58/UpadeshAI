'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import axios from 'axios'

interface Message {
  role: 'user' | 'assistant'
  content: string
  shloka?: {
    id?: number
    chapter?: number | null
    verse?: number | null
    reference?: string
    sanskrit?: string
    transliteration?: string
    translation?: string
    meaning?: string
    explanation?: string
    verseNumber?: number
  } | null
  sources?: Array<{
    id?: number
    reference?: string
    chapter?: number | null
    verse?: number | null
    score?: number
    translation?: string
    role?: string
  }>
  timestamp: Date
  isStreaming?: boolean
  messageId?: string
  feedback?: 1 | -1 | null
}

interface ChatInterfaceProps {
  sessionId: string | null
  setSessionId: (id: string) => void
}

function parseSseBlocks(buffer: string): { events: any[]; rest: string } {
  const events: any[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() || ''
  for (const block of parts) {
    const line = block
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('data:'))
    if (!line) continue
    const json = line.replace(/^data:\s*/, '')
    try {
      events.push(JSON.parse(json))
    } catch {
      // ignore
    }
  }
  return { events, rest }
}

export default function ChatInterface({ sessionId, setSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const starterSent = useRef(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (sessionId) {
      loadChatHistory()
    }
  }, [sessionId])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      },
    ])

    try {
      const response = await fetch(`${API_URL}/api/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: sessionId,
          stream: true,
        }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sawStart = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const { events, rest } = parseSseBlocks(buffer)
        buffer = rest

        for (const event of events) {
          if (event.type === 'start') {
            sawStart = true
            const newSessionId = event.sessionId as string
            if (!sessionId && newSessionId) {
              setSessionId(newSessionId)
              localStorage.setItem('dharma-session-id', newSessionId)
            }
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  messageId: event.messageId,
                  shloka: event.topVerse ?? null,
                  sources: event.sources || [],
                  isStreaming: true,
                }
              }
              return next
            })
          } else if (event.type === 'chunk' && event.text) {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: last.content + event.text,
                  isStreaming: true,
                }
              }
              return next
            })
          } else if (event.type === 'end') {
            setMessages((prev) => {
              const next = [...prev]
              const last = next[next.length - 1]
              if (last?.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  messageId: event.messageId || last.messageId,
                  sources: event.sources || last.sources,
                  isStreaming: false,
                }
              }
              return next
            })
          } else if (event.type === 'error') {
            throw new Error(event.error || 'Stream error')
          }
        }
      }

      if (!sawStart) {
        throw new Error('No stream events received')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last?.role === 'assistant' && last.isStreaming) {
          next[next.length - 1] = {
            ...last,
            content:
              last.content ||
              'Something went wrong. Please try again.',
            isStreaming: false,
          }
          return next
        }
        return [
          ...prev,
          {
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            timestamp: new Date(),
          },
        ]
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (starterSent.current) return
    const starter = sessionStorage.getItem('upadesh-starter')
    if (starter) {
      starterSent.current = true
      sessionStorage.removeItem('upadesh-starter')
      void sendMessage(starter)
    }
  }, [])

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/history/${sessionId}`)
      if (response.data.messages) {
        setMessages(
          response.data.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }))
        )
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage(input)
    }
  }

  const lastIsStreaming =
    messages.length > 0 &&
    messages[messages.length - 1].role === 'assistant' &&
    messages[messages.length - 1].isStreaming

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-3xl flex-col px-4 sm:px-6">
      <div className="chat-scroll flex-1 space-y-5 overflow-y-auto py-6">
        {messages.length === 0 && !isLoading ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <p className="font-serif text-xl text-ink">What is on your mind?</p>
              <p className="mt-2 text-sm text-ink-faint">
                Ask about a feeling, decision, or struggle in life.
              </p>
            </div>
          </div>
        ) : null}

        {messages.map((message, index) => {
          const priorUser =
            message.role === 'assistant'
              ? [...messages.slice(0, index)].reverse().find((m) => m.role === 'user')
              : undefined
          return (
            <MessageBubble
              key={message.messageId || index}
              message={message}
              userQuery={priorUser?.content || ''}
              sessionId={sessionId}
              apiUrl={API_URL}
              onFeedback={(messageId, rating) => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.messageId === messageId ? { ...m, feedback: rating } : m
                  )
                )
              }}
            />
          )
        })}

        {isLoading && !lastIsStreaming ? (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line bg-paper px-4 py-3">
              <div className="typing-indicator flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
                <span className="h-1.5 w-1.5 rounded-full bg-ink-faint" />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <div className="shrink-0 border-t border-line bg-canvas pb-4 pt-3">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 rounded-xl border border-line bg-paper p-2 shadow-sm focus-within:border-moss/40">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a message…"
              className="max-h-36 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none"
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-moss text-paper transition hover:bg-moss-hover disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-ink-faint">
            Enter to send · Shift+Enter for a new line · Guidance only, not a substitute for care
          </p>
        </form>
      </div>
    </div>
  )
}
