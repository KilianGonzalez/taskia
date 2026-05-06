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
  low: 'border-border bg-muted/50 text-foreground',
  medium: 'border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
  high: 'border-red-200/70 bg-red-50/80 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
}

export function AiPlannerPanel({
  suggestions,
  conflicts,
  onAcceptSuggestion,
}: AiPlannerPanelProps) {
  return (
    <aside className="space-y-4">
      <div className="app-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-semibold text-foreground">Conflictos detectados</h4>
        </div>

        <div className="space-y-3">
          {conflicts.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
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

      <div className="app-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#4EC4A9]" />
          <h4 className="text-sm font-semibold text-foreground">Sugerencias IA</h4>
        </div>

        <div className="space-y-3">
          {suggestions.length === 0 ? (
            <div className="rounded-2xl border border-border bg-muted/60 p-4 text-sm text-muted-foreground">
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
