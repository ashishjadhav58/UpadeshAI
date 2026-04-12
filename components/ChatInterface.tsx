'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import axios from 'axios'

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

interface ChatInterfaceProps {
  sessionId: string | null
  setSessionId: (id: string) => void
}

export default function ChatInterface({ sessionId, setSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  const loadChatHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/history/${sessionId}`)
      if (response.data.messages) {
        setMessages(response.data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })))
      }
    } catch (error) {
      console.error('Error loading chat history:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await axios.post(`${API_URL}/api/chat/message`, {
        message: userMessage.content,
        sessionId: sessionId,
      })

      const newSessionId = response.data.sessionId
      if (!sessionId) {
        setSessionId(newSessionId)
        localStorage.setItem('dharma-session-id', newSessionId)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response,
        shloka: response.data.shloka,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-88px)] flex flex-col">
      <div className="flex-1 overflow-y-auto chat-scroll mb-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-400">
              <p className="text-lg mb-2">Share what's on your mind...</p>
              <p className="text-sm">I'm here to offer guidance from the Bhagavad Gita</p>
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white/5 px-6 py-4 backdrop-blur-sm border border-white/10 max-w-[80%]">
              <div className="typing-indicator flex gap-1">
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                <span className="h-2 w-2 rounded-full bg-orange-500"></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <div className="rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 focus-within:border-orange-500/50 transition-all duration-300">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts or ask for guidance..."
            className="w-full bg-transparent px-6 py-4 text-white placeholder-gray-400 resize-none focus:outline-none min-h-[60px] max-h-[200px]"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex items-center justify-between px-4 pb-4">
            <p className="text-xs text-gray-500">Press Enter to send, Shift+Enter for new line</p>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 p-3 text-white shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/70 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </form>
      
      {/* Footer */}
      <div className="text-center py-3 text-xs text-gray-500 border-t border-white/5">
        Created by{' '}
        <a 
          href="https://github.com/ashishjadhav58" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-orange-400 hover:text-orange-300 transition-colors underline"
        >
          ashishjadhav58
        </a>
      </div>
    </div>
  )
}
