'use client'

import { Plus, MessageSquare, Trash2, X } from 'lucide-react'
import type { StoredSession } from '@/lib/sessionStore'

interface ChatSidebarProps {
  sessions: StoredSession[]
  activeSessionId: string | null
  open: boolean
  onClose: () => void
  onNewChat: () => void
  onSelect: (sessionId: string) => void
  onDelete: (sessionId: string) => void
}

function formatWhen(iso: string) {
  try {
    const d = new Date(iso)
    const now = new Date()
    const sameDay = d.toDateString() === now.toDateString()
    if (sameDay) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  open,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
}: ChatSidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open ? (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-30 bg-ink/20 md:hidden"
          onClick={onClose}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-line bg-paper transition-transform duration-200 md:static md:z-0 md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-line px-3">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-faint">
            Chats
          </p>
          <button
            type="button"
            className="rounded-md p-1.5 text-ink-faint hover:bg-line/70 hover:text-ink md:hidden"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-moss px-3 py-2.5 text-sm font-medium text-paper transition hover:bg-moss-hover"
          >
            <Plus className="h-4 w-4" />
            New chat
          </button>
        </div>

        <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {sessions.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-ink-faint">
              No chats yet. Start a conversation.
            </p>
          ) : (
            sessions.map((s) => {
              const active = s.sessionId === activeSessionId
              return (
                <div
                  key={s.sessionId}
                  className={`group flex items-start gap-1 rounded-lg px-2 py-2 ${
                    active ? 'bg-moss-soft' : 'hover:bg-canvas'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(s.sessionId)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start gap-2">
                      <MessageSquare
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          active ? 'text-moss' : 'text-ink-faint'
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm ${
                            active ? 'font-medium text-ink' : 'text-ink-muted'
                          }`}
                        >
                          {s.title || 'New chat'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-faint">
                          {formatWhen(s.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete chat"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(s.sessionId)
                    }}
                    className="rounded p-1 text-ink-faint opacity-0 transition hover:bg-line hover:text-ink group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}
