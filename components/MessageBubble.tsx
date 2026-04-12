'use client'

import { User, Sparkles } from 'lucide-react'
import ShlokaCard from './ShlokaCard'

interface Message {
  role: 'user' | 'assistant'
  content: string
  shloka?: {
    id: number
    chapter: number
    verse: number
    sanskrit: string
    transliteration: string
    translation: string
    meaning: string
    explanation: string
  }
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div className={`flex gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
          isUser 
            ? 'bg-gradient-to-br from-blue-500 to-purple-500' 
            : 'bg-gradient-to-br from-orange-500 to-pink-500'
        }`}>
          {isUser ? (
            <User className="h-5 w-5 text-white" />
          ) : (
            <Sparkles className="h-5 w-5 text-white" />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className={`rounded-2xl px-6 py-4 backdrop-blur-sm border ${
            isUser
              ? 'bg-blue-500/20 border-blue-500/30'
              : 'bg-white/5 border-white/10'
          }`}>
            <p className="text-white whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>

          {message.shloka && !isUser && (
            <ShlokaCard shloka={message.shloka} />
          )}

          <p className="text-xs text-gray-500 px-2">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
