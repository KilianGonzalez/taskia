'use client'

import { ArrowRight, Brain, CalendarDays, Target, Zap } from 'lucide-react'
import type { AiSuggestion } from './ai-types'

type AiSuggestionCardProps = {
  suggestion: AiSuggestion
  onAccept?: (suggestion: AiSuggestion) => void
}

const impactStyles = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-50 text-amber-700',
  high: 'bg-red-50 text-red-600',
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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4EC4A9]/10">
            <Icon className="h-5 w-5 text-[#1D2155]" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[#1D2155]">
              {suggestion.title}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
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
          className="inline-flex items-center gap-2 text-sm font-medium text-[#20589A] transition-colors hover:text-[#1D2155]"
        >
          {suggestion.ctaLabel ?? 'Aplicar sugerencia'}
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}