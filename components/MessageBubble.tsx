'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import ShlokaCard from './ShlokaCard'

interface Shloka {
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
}

interface SourceRef {
  id?: number
  reference?: string
  chapter?: number | null
  verse?: number | null
  score?: number
  translation?: string
  role?: 'primary' | 'supporting' | string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  shloka?: Shloka | null
  sources?: SourceRef[]
  timestamp: Date
  isStreaming?: boolean
  messageId?: string
  feedback?: 1 | -1 | null
}

interface MessageBubbleProps {
  message: Message
  userQuery?: string
  sessionId?: string | null
  apiUrl?: string
  onFeedback?: (messageId: string, rating: 1 | -1) => void
}

/** Light formatting for **section** headings from the model */
function formatContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="mt-3 mb-1 block font-semibold text-ink first:mt-0">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function MessageBubble({
  message,
  userQuery = '',
  sessionId = null,
  apiUrl = 'http://localhost:3001',
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [pending, setPending] = useState(false)
  const [localFeedback, setLocalFeedback] = useState<1 | -1 | null>(
    message.feedback ?? null
  )

  const submitFeedback = async (rating: 1 | -1) => {
    if (pending || message.isStreaming || !sessionId) return
    setPending(true)
    try {
      const res = await fetch(`${apiUrl}/api/chat/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: message.messageId,
          sessionId,
          rating,
          query: userQuery,
          response: message.content,
          sources: (message.sources || []).map((s) => ({
            id: s.id,
            reference: s.reference,
            chapter: s.chapter,
            verse: s.verse,
            score: s.score,
          })),
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setLocalFeedback(rating)
      if (message.messageId) onFeedback?.(message.messageId, rating)
    } catch (err) {
      console.error('Feedback failed:', err)
    } finally {
      setPending(false)
    }
  }

  return (
    <div
      className={`flex w-full animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex max-w-[min(100%,36rem)] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 text-[15px] leading-relaxed ${
            isUser
              ? 'rounded-2xl rounded-br-md bg-[#ebeae6] text-ink'
              : 'rounded-2xl rounded-bl-md border border-line bg-paper text-ink'
          }`}
        >
          <div className="message-body whitespace-pre-wrap">
            {isUser ? message.content : formatContent(message.content)}
            {message.isStreaming ? (
              <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-moss align-middle" />
            ) : null}
          </div>

          {!isUser && message.shloka?.reference ? (
            <p className="mt-3 border-t border-line pt-2 text-xs text-ink-faint">
              Primary: {message.shloka.reference}
              {message.sources &&
              message.sources.filter((s) => s.id !== message.shloka?.id).length > 0
                ? ` · Supporting: ${message.sources
                    .filter((s) => s.id !== message.shloka?.id)
                    .slice(0, 2)
                    .map((s) => s.reference)
                    .filter(Boolean)
                    .join(', ')}`
                : ''}
            </p>
          ) : null}
        </div>

        {message.shloka && !isUser ? (
          <ShlokaCard shloka={message.shloka} sources={message.sources} />
        ) : null}

        {!isUser && !message.isStreaming && message.content ? (
          <div className="flex items-center gap-1.5 px-1">
            <button
              type="button"
              aria-label="Thumbs up"
              disabled={pending || localFeedback !== null}
              onClick={() => submitFeedback(1)}
              className={`rounded-md p-1.5 transition ${
                localFeedback === 1
                  ? 'bg-moss-soft text-moss'
                  : 'text-ink-faint hover:bg-line/60 hover:text-ink'
              } disabled:opacity-50`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Thumbs down"
              disabled={pending || localFeedback !== null}
              onClick={() => submitFeedback(-1)}
              className={`rounded-md p-1.5 transition ${
                localFeedback === -1
                  ? 'bg-red-50 text-red-700'
                  : 'text-ink-faint hover:bg-line/60 hover:text-ink'
              } disabled:opacity-50`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
            {localFeedback !== null ? (
              <span className="ml-1 text-xs text-ink-faint">Thanks</span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
