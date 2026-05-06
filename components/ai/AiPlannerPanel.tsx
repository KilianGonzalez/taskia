'use client'

import { AlertTriangle, Sparkles } from 'lucide-react'
import { AiSuggestionCard } from './AiSuggestionCard'
import type { AiConflict, AiSuggestion } from './ai-types'

type AiPlannerPanelProps = {
  suggestions: AiSuggestion[]
  conflicts: AiConflict[]
  onAcceptSuggestion?: (suggestion: AiSuggestion) => void
}

const severityStyles = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-red-200 bg-red-50 text-red-700',
}

export function AiPlannerPanel({
  suggestions,
  conflicts,
  onAcceptSuggestion,
}: AiPlannerPanelProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-[#1D2155]">Conflictos detectados</h4>
        </div>

        <div className="space-y-3">
          {conflicts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              No hay conflictos importantes ahora mismo.
            </div>
          ) : (
            conflicts.map((conflict) => (
              <div
                key={conflict.id}
                className={`rounded-2xl border p-4 text-sm ${severityStyles[conflict.severity]}`}
              >
                <p className="font-semibold">{conflict.title}</p>
                <p className="mt-1 leading-relaxed">{conflict.description}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#4EC4A9]" />
          <h4 className="text-sm font-semibold text-[#1D2155]">Sugerencias IA</h4>
        </div>

        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Aun no hay sugerencias nuevas.
            </div>
          ) : (
            suggestions.map((suggestion) => (
              <AiSuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                onAccept={onAcceptSuggestion}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  )
}
