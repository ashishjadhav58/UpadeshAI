'use client'

import { useState, useEffect, useCallback } from 'react'
import ChatInterface from '@/components/ChatInterface'
import ChatSidebar from '@/components/ChatSidebar'
import Header from '@/components/Header'
import WelcomeScreen from '@/components/WelcomeScreen'
import {
  loadSessionList,
  rememberSession,
  removeSession,
  clearActiveSession,
  type StoredSession,
} from '@/lib/sessionStore'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(true)
  const [sessions, setSessions] = useState<StoredSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatKey, setChatKey] = useState(0)

  const refreshSessionsFromApi = useCallback(async (list: StoredSession[]) => {
    if (!list.length) {
      setSessions([])
      return
    }
    try {
      const ids = list.map((s) => s.sessionId).join(',')
      const res = await fetch(`${API_URL}/api/chat/sessions?ids=${encodeURIComponent(ids)}`)
      if (!res.ok) {
        setSessions(list)
        return
      }
      const remote = await res.json()
      const byId = new Map(
        (Array.isArray(remote) ? remote : []).map((r: any) => [r.sessionId, r])
      )
      const merged: StoredSession[] = list.map((local) => {
        const r = byId.get(local.sessionId)
        if (!r) return local
        return {
          sessionId: local.sessionId,
          title: r.title || local.title,
          updatedAt: r.updatedAt || local.updatedAt,
        }
      })
      // Keep local order (most recent first) but prefer remote updatedAt sort if available
      merged.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      setSessions(merged)
    } catch {
      setSessions(list)
    }
  }, [])

  useEffect(() => {
    const list = loadSessionList()
    const saved = localStorage.getItem('dharma-session-id')
    if (saved) {
      setSessionId(saved)
      setShowWelcome(false)
    }
    void refreshSessionsFromApi(list)
  }, [refreshSessionsFromApi])

  const handleStartChat = (prompt?: string) => {
    setShowWelcome(false)
    if (prompt) {
      sessionStorage.setItem('upadesh-starter', prompt)
    }
  }

  const handleNewChat = () => {
    clearActiveSession()
    setSessionId(null)
    setShowWelcome(false)
    setChatKey((k) => k + 1)
    setSidebarOpen(false)
    sessionStorage.removeItem('upadesh-starter')
  }

  const handleSelectSession = (id: string) => {
    setSessionId(id)
    localStorage.setItem('dharma-session-id', id)
    setShowWelcome(false)
    setChatKey((k) => k + 1)
    setSidebarOpen(false)
    sessionStorage.removeItem('upadesh-starter')
  }

  const handleDeleteSession = (id: string) => {
    const next = removeSession(id)
    setSessions(next)
    if (sessionId === id) {
      clearActiveSession()
      setSessionId(null)
      setChatKey((k) => k + 1)
    }
  }

  const handleSessionChange = (id: string, title?: string) => {
    const list = rememberSession(id, title)
    setSessionId(id)
    setSessions(list)
  }

  return (
    <main className="flex min-h-screen bg-canvas text-ink">
      <ChatSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onSelect={handleSelectSession}
        onDelete={handleDeleteSession}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onNewChat={handleNewChat}
        />
        {showWelcome ? (
          <WelcomeScreen onStart={handleStartChat} />
        ) : (
          <ChatInterface
            key={chatKey}
            sessionId={sessionId}
            setSessionId={setSessionId}
            onSessionChange={handleSessionChange}
          />
        )}
      </div>
    </main>
  )
}
