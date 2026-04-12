'use client'

import { Sparkles, Heart, BookOpen, Compass } from 'lucide-react'

interface WelcomeScreenProps {
  onStart: () => void
}

export default function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  const features = [
    {
      icon: Heart,
      title: 'Compassionate Guidance',
      description: 'Receive empathetic support for your life challenges',
    },
    {
      icon: BookOpen,
      title: 'Ancient Wisdom',
      description: 'Access timeless teachings from the Bhagavad Gita',
    },
    {
      icon: Compass,
      title: 'Practical Advice',
      description: 'Get actionable insights for modern life situations',
    },
  ]

  const examples = [
    'I feel lost in my career path',
    'How do I deal with failure?',
    'I struggle with anxiety and stress',
    'How can I find inner peace?',
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-12 animate-fade-in">
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 shadow-2xl shadow-orange-500/50">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="mb-4 text-5xl font-bold gradient-text">
            Welcome to Dharma AI
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Your spiritual companion for life's journey
          </p>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Share your thoughts, challenges, or questions, and receive wisdom from the Bhagavad Gita
            tailored to your situation
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12 animate-slide-up">
          {features.map((feature, index) => (
            <div
              key={index}
              className="rounded-2xl bg-white/5 p-6 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <feature.icon className="h-8 w-8 text-orange-500 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Try asking about...
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={onStart}
                className="rounded-xl bg-white/5 p-4 text-left backdrop-blur-sm border border-white/10 hover:bg-white/10 hover:border-orange-500/50 transition-all duration-300 group"
              >
                <p className="text-gray-300 group-hover:text-white transition-colors">
                  "{example}"
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onStart}
            className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/50 hover:shadow-xl hover:shadow-orange-500/70 transition-all duration-300 hover:scale-105"
          >
            Start Your Journey
          </button>
        </div>
      </div>
    </div>
  )
}
