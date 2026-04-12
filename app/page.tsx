'use client'

import { useState, useEffect } from 'react'
import ChatInterface from '@/components/ChatInterface'
import Header from '@/components/Header'
import WelcomeScreen from '@/components/WelcomeScreen'

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    const savedSessionId = localStorage.getItem('dharma-session-id')
    if (savedSessionId) {
      setSessionId(savedSessionId)
      setShowWelcome(false)
    }
  }, [])

  const handleStartChat = () => {
    setShowWelcome(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Header />
      {showWelcome ? (
        <WelcomeScreen onStart={handleStartChat} />
      ) : (
        <ChatInterface sessionId={sessionId} setSessionId={setSessionId} />
      )}
    </main>
  )
}
