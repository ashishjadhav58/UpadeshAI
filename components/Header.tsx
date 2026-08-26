'use client'

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
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
    </header>
  )
}
