'use client'

import { useState } from 'react'
import CalendarView from '@/components/calendar/CalendarView'
import { AiCommandBar } from '@/components/ai/AiCommandBar'
import { AiPlannerPanel } from '@/components/ai/AiPlannerPanel'
import type { AiChange, AiConflict, AiSuggestion } from '@/components/ai/ai-types'

type CalendarAiShellProps = {
  initialEvents: any[]
  flexibleTasks: any[]
}

export function CalendarAiShell({
  initialEvents,
  flexibleTasks,
}: CalendarAiShellProps) {
  const [events, setEvents] = useState(initialEvents)

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([
    {
      id: '1',
      title: 'Aligerar esta tarde',
      reason: 'Hay un bloque exigente después de una actividad fija.',
      impact: 'medium',
      type: 'energy',
      ctaLabel: 'Aplicar ajuste',
    },
  ])

  const [conflicts, setConflicts] = useState<AiConflict[]>([
    {
      id: '1',
      title: 'Miércoles cargado',
      description: 'Tienes varios bloques muy juntos y poca recuperación.',
      severity: 'medium',
    },
  ])

  const [proposedChanges, setProposedChanges] = useState<AiChange[]>([])

  async function handleSubmit(prompt: string) {
    setProposedChanges((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: 'move_block',
        title: 'Cambio generado por IA',
        description: `La IA ha interpretado: "${prompt}"`,
        reason: 'Borrador pendiente de aplicar.',
      },
    ])
  }

  async function handleApplyPlan() {
    setProposedChanges([])
  }

  async function handleReplanDay() {
    setSuggestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: 'Añadir descanso corto',
        reason: 'La tarde será más sostenible con una pausa entre bloques largos.',
        impact: 'low',
        type: 'schedule',
      },
    ])
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Mi Calendario</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Visualiza, gestiona y ajusta tu semana con ayuda de la IA
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
            TaskIA
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Google Calendar
          </span>
        </div>
      </div>

      <AiCommandBar onSubmit={handleSubmit} />

      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-h-0 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <CalendarView
            initialEvents={events}
            flexibleTasks={flexibleTasks}
          />
        </div>

        <div className="min-h-0 overflow-y-auto">
          <AiPlannerPanel
            todaySummary={{
              freeHours: 4,
              pendingTasks: 6,
              urgentGoals: 2,
            }}
            suggestions={suggestions}
            conflicts={conflicts}
            proposedChanges={proposedChanges}
            onApplyPlan={handleApplyPlan}
            onDiscardPlan={() => setProposedChanges([])}
            onReplanDay={handleReplanDay}
            onAcceptSuggestion={(suggestion) => {
              setProposedChanges((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  type: 'create_block',
                  title: suggestion.title,
                  description: suggestion.reason,
                  reason: 'Aceptado desde sugerencias IA.',
                },
              ])
            }}
          />
        </div>
      </div>
    </div>
  )
}