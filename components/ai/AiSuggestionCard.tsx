'use client'

import { ArrowRight, Brain, CalendarDays, Target, Zap } from 'lucide-react'
import type { AiSuggestion } from './ai-types'

type AiSuggestionCardProps = {
  suggestion: AiSuggestion
  onAccept?: (suggestion: AiSuggestion) => void
}

const impactStyles = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-950/35 dark:text-amber-300',
  high: 'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-300',
}

const typeIconMap = {
  schedule: CalendarDays,
  task: Target,
  goal: Brain,
  energy: Zap,
}

export function AiSuggestionCard({
  suggestion,
  onAccept,
}: AiSuggestionCardProps) {
  const Icon = typeIconMap[suggestion.type]

  return (
    <div className="app-card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4EC4A9]/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {suggestion.title}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {suggestion.reason}
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${impactStyles[suggestion.impact]}`}
        >
          {suggestion.impact === 'low'
            ? 'Bajo'
            : suggestion.impact === 'medium'
            ? 'Medio'
            : 'Alto'}
        </span>
      </div>

      {onAccept && (
        <button
          type="button"
          onClick={() => onAccept(suggestion)}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-foreground"
        >
          {suggestion.ctaLabel ?? 'Aplicar sugerencia'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
