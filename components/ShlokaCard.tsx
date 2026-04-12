'use client'

import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

interface Shloka {
  id: number
  chapter: number
  verse: number
  sanskrit: string
  transliteration: string
  translation: string
  meaning: string
  explanation: string
}

interface ShlokaCardProps {
  shloka: Shloka
}

export default function ShlokaCard({ shloka }: ShlokaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/30 backdrop-blur-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-500/20">
            <BookOpen className="h-5 w-5 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-orange-400 mb-1">
              Bhagavad Gita - Chapter {shloka.chapter}, Verse {shloka.verse}
            </h3>
            <p className="text-lg font-serif text-amber-200 mb-3 leading-relaxed">
              {shloka.sanskrit}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
              Translation
            </h4>
            <p className="text-gray-200 leading-relaxed">
              {shloka.translation}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
              Meaning
            </h4>
            <p className="text-gray-200 leading-relaxed">
              {shloka.meaning}
            </p>
          </div>

          {isExpanded && (
            <>
              <div className="pt-2 border-t border-white/10">
                <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                  Transliteration
                </h4>
                <p className="text-gray-300 italic leading-relaxed">
                  {shloka.transliteration}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
                  Detailed Explanation
                </h4>
                <p className="text-gray-200 leading-relaxed">
                  {shloka.explanation}
                </p>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-4 flex items-center gap-2 text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Show more details
            </>
          )}
        </button>
      </div>
    </div>
  )
}
