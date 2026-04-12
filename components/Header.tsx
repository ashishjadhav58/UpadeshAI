'use client'

import { Sparkles } from 'lucide-react'

export default function Header() {
  return (
    <header className="border-b border-white/10 bg-black/20 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">Upadesh AI</h1>
              <p className="text-xs text-gray-400">Spiritual Guidance from Bhagavad Gita</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
