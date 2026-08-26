'use client'

import { Menu, SquarePen } from 'lucide-react'

interface HeaderProps {
  onMenuClick?: () => void
  onNewChat?: () => void
}

export default function Header({ onMenuClick, onNewChat }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-3 sm:px-5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMenuClick}
            className="rounded-md p-2 text-ink-muted hover:bg-line/70 hover:text-ink md:hidden"
            aria-label="Open chats"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-moss text-paper">
              <span className="font-serif text-sm font-semibold leading-none">उ</span>
            </div>
            <div>
              <p className="font-serif text-[15px] font-semibold tracking-tight text-ink">
                Upadesh AI
              </p>
              <p className="text-[11px] leading-none text-ink-faint">
                Guidance from the Bhagavad Gita
              </p>
            </div>
          </div>
        </div>

        {onNewChat ? (
          <button
            type="button"
            onClick={onNewChat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-moss/30 hover:text-ink"
          >
            <SquarePen className="h-3.5 w-3.5" />
            New chat
          </button>
        ) : null}
      </div>
    </header>
  )
}
