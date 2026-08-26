'use client'

interface WelcomeScreenProps {
  onStart: (prompt?: string) => void
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const examples = [
    'I feel lost in my career path',
    'How do I deal with failure?',
    'I struggle with anxiety before presentations',
    'I am confused about what decision to make',
  ]

  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <div className="animate-fade-in">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-faint">
          Spiritual guidance
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          Upadesh AI
        </h1>
        <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-ink-muted">
          Share what you are facing. Receive grounded guidance from the Bhagavad Gita,
          with clear verse sources—not generic advice.
        </p>

        <div className="mt-10">
          <p className="mb-3 text-sm font-medium text-ink">Try a prompt</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onStart(example)}
                className="rounded-lg border border-line bg-paper px-4 py-3 text-left text-sm text-ink-muted transition hover:border-moss/30 hover:bg-moss-soft/40 hover:text-ink"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStart()}
          className="mt-8 rounded-lg bg-moss px-5 py-2.5 text-sm font-medium text-paper transition hover:bg-moss-hover"
        >
          Start conversation
        </button>
      </div>
    </div>
  )
}
