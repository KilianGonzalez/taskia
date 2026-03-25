'use client'

import { AlertTriangle, CalendarClock, CheckCircle2, RefreshCw, Sparkles } from 'lucide-react'
import { AiSuggestionCard } from './AiSuggestionCard'
import type {
  AiChange,
  AiConflict,
  AiPlannerTodaySummary,
  AiSuggestion,
} from './ai-types'

type AiPlannerPanelProps = {
  todaySummary: AiPlannerTodaySummary
  suggestions: AiSuggestion[]
  conflicts: AiConflict[]
  proposedChanges: AiChange[]
  onApplyPlan: () => Promise<void>
  onDiscardPlan: () => void
  onReplanDay: () => Promise<void>
  onAcceptSuggestion?: (suggestion: AiSuggestion) => void
  isApplying?: boolean
  isReplanning?: boolean
}

const severityStyles = {
  low: 'border-slate-200 bg-slate-50 text-slate-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  high: 'border-red-200 bg-red-50 text-red-700',
}

export function AiPlannerPanel({
  todaySummary,
  suggestions,
  conflicts,
  proposedChanges,
  onApplyPlan,
  onDiscardPlan,
  onReplanDay,
  onAcceptSuggestion,
  isApplying = false,
  isReplanning = false,
}: AiPlannerPanelProps) {
  return (
    <aside className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4EC4A9] to-[#20589A]">
            <Sparkles className="h-5 w-5 text-white" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-[#1D2155]">Planificador IA</h3>
            <p className="text-xs text-slate-500">Resumen rápido de hoy</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Horas libres</p>
            <p className="mt-1 text-lg font-bold text-[#1D2155]">
              {todaySummary.freeHours}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Pendientes</p>
            <p className="mt-1 text-lg font-bold text-[#1D2155]">
              {todaySummary.pendingTasks}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Urgentes</p>
            <p className="mt-1 text-lg font-bold text-[#1D2155]">
              {todaySummary.urgentGoals}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onReplanDay}
            disabled={isReplanning}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isReplanning ? 'animate-spin' : ''}`} />
            {isReplanning ? 'Replanificando...' : 'Replanificar día'}
          </button>

          <button
            type="button"
            onClick={onApplyPlan}
            disabled={isApplying || proposedChanges.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#1D2155] to-[#20589A] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isApplying ? 'Aplicando...' : 'Aplicar plan'}
          </button>
        </div>

        {proposedChanges.length > 0 && (
          <button
            type="button"
            onClick={onDiscardPlan}
            className="mt-2 w-full rounded-2xl border border-dashed border-slate-200 px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
          >
            Descartar propuesta
          </button>
        )}
      </div>

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
              Aún no hay sugerencias nuevas.
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

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[#20589A]" />
          <h4 className="text-sm font-semibold text-[#1D2155]">Cambios propuestos</h4>
        </div>

        <div className="space-y-3">
          {proposedChanges.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              Todavía no hay cambios en borrador.
            </div>
          ) : (
            proposedChanges.map((change) => (
              <div
                key={change.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-semibold text-[#1D2155]">{change.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  {change.description}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Motivo: {change.reason}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  )
}