'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
  score?: number
}

interface SourceRef {
  id?: number
  reference?: string
  chapter?: number | null
  verse?: number | null
  score?: number
  translation?: string
}

interface ShlokaCardProps {
  shloka: Shloka
  sources?: SourceRef[]
}

export default function ShlokaCard({ shloka, sources = [] }: ShlokaCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const heading =
    shloka.reference ||
    (shloka.chapter != null && shloka.verse != null
      ? `Bhagavad Gita ${shloka.chapter}.${shloka.verse}`
      : shloka.verseNumber != null
        ? `Verse ${shloka.verseNumber}`
        : 'Source')

  const otherSources = sources.filter(
    (s) => s.id != null && shloka.id != null && s.id !== shloka.id
  )

  return (
    <div className="w-full max-w-[min(100%,36rem)] overflow-hidden rounded-xl border border-line bg-paper">
      <div className="px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-faint">
          Primary source
        </p>
        <h3 className="mt-1 font-serif text-base font-semibold text-ink">{heading}</h3>
        {shloka.chapter != null && shloka.verse != null ? (
          <p className="mt-0.5 text-xs text-ink-faint">
            Chapter {shloka.chapter}, Verse {shloka.verse}
          </p>
        ) : null}

        {shloka.sanskrit ? (
          <p className="mt-3 font-serif text-[15px] leading-relaxed text-ink-muted whitespace-pre-wrap">
            {shloka.sanskrit}
          </p>
        ) : null}

        {shloka.translation ? (
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
              Translation
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink">{shloka.translation}</p>
          </div>
        ) : null}

        {shloka.meaning ? (
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
              Meaning
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{shloka.meaning}</p>
          </div>
        ) : null}

        {isExpanded ? (
          <div className="mt-3 space-y-3 border-t border-line pt-3">
            {shloka.transliteration ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Transliteration
                </p>
                <p className="mt-1 text-sm italic leading-relaxed text-ink-muted whitespace-pre-wrap">
                  {shloka.transliteration}
                </p>
              </div>
            ) : null}

            {shloka.explanation ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Commentary
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                  {shloka.explanation}
                </p>
              </div>
            ) : null}

            {otherSources.length > 0 ? (
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-faint">
                  Supporting sources
                </p>
                <ul className="mt-1.5 space-y-1">
                  {otherSources.map((s) => (
                    <li
                      key={s.id ?? s.reference}
                      className="flex justify-between gap-3 text-sm text-ink-muted"
                    >
                      <span>{s.reference || `Verse ${s.id}`}</span>
                      {typeof s.score === 'number' ? (
                        <span className="tabular-nums text-ink-faint">
                          {(s.score * 100).toFixed(0)}%
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-moss hover:text-moss-hover"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              More details
              {otherSources.length > 0 ? ` · ${otherSources.length} supporting` : ''}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
