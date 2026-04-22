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
  const [isApplying, setIsApplying] = useState(false)
  const [isReplanning, setIsReplanning] = useState(false)

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([
    {
      id: '1',
      title: 'Optimizar horario de estudio',
      reason: 'Detecté que tienes 3 horas libres hoy. Podrías avanzar en el proyecto de matemáticas.',
      impact: 'medium',
      type: 'task',
      ctaLabel: 'Ver sugerencias',
    },
    {
      id: '2',
      title: 'Añadir descanso entre sesiones',
      reason: 'Tu sesión de estudio de 2 horas seguida de otra reunión podría ser agotadora.',
      impact: 'low',
      type: 'schedule',
      ctaLabel: 'Añadir pausa',
    },
  ])

  const [conflicts, setConflicts] = useState<AiConflict[]>([
    {
      id: '1',
      title: 'Solapamiento de horarios',
      description: 'Tienes "Reunión equipo" a las 14:00 y "Estudio Física" a las 14:30. Considera mover una.',
      severity: 'high',
    },
  ])

  const [proposedChanges, setProposedChanges] = useState<AiChange[]>([])

  async function handleSubmit(prompt: string) {
    try {
      // Simular procesamiento de comando de IA
      const commandType = analyzeCommand(prompt)
      
      switch (commandType) {
        case 'move_block':
          handleMoveBlock(prompt)
          break
        case 'create_block':
          handleCreateBlock(prompt)
          break
        case 'split_task':
          handleSplitTask(prompt)
          break
        case 'add_break':
          handleAddBreak(prompt)
          break
        case 'replan_day':
          handleReplanDay()
          break
        default:
          // Comando genérico - añadir como cambio propuesto
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
    } catch (error) {
      console.error('Error procesando comando IA:', error)
    }
  }

  function analyzeCommand(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('mueve') || lowerPrompt.includes('move') || lowerPrompt.includes('cambia')) {
      return 'move_block'
    }
    if (lowerPrompt.includes('crea') || lowerPrompt.includes('añade') || lowerPrompt.includes('nuevo')) {
      return 'create_block'
    }
    if (lowerPrompt.includes('divide') || lowerPrompt.includes('split')) {
      return 'split_task'
    }
    if (lowerPrompt.includes('descanso') || lowerPrompt.includes('pausa') || lowerPrompt.includes('break')) {
      return 'add_break'
    }
    if (lowerPrompt.includes('replanifica') || lowerPrompt.includes('reorganiza')) {
      return 'replan_day'
    }
    
    return 'generic'
  }

  function handleMoveBlock(prompt: string) {
    const timeMatch = prompt.match(/(\d{1,2}):?(\d{2})/g)
    const taskMatch = prompt.match(/tarea\s+"?([^"]+)"/i)
    
    console.log('handleMoveBlock:', { prompt, timeMatch, taskMatch })
    
    if (timeMatch && taskMatch) {
      const timeParts = timeMatch[0].match(/(\d{1,2}):?(\d{2})/)
      if (timeParts) {
        const [, hours, minutes] = timeParts
        const taskName = taskMatch[1]
        
        console.log('Creando cambio mover:', { taskName, hours, minutes })
        
        setProposedChanges((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            type: 'move_block',
            title: `Mover "${taskName}"`,
            description: `Mover tarea "${taskName}" a las ${hours}:${minutes}`,
            reason: 'Optimización de horario solicitada por usuario.',
          },
        ])
      }
    }
  }

  function handleCreateBlock(prompt: string) {
    const taskMatch = prompt.match(/tarea\s+"?([^"]+)"/i)
    const timeMatch = prompt.match(/(\d{1,2}):?(\d{2})/g)
    const durationMatch = prompt.match(/(\d+)\s*minutos?/i)
    
    if (taskMatch) {
      const taskName = taskMatch[1]
      const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '09:00'
      const duration = durationMatch ? parseInt(durationMatch[1]) : 60
      
      setProposedChanges((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'create_block',
          title: `Crear "${taskName}"`,
          description: `Crear nueva tarea "${taskName}" a las ${time} por ${duration} minutos`,
          reason: 'Nueva tarea solicitada por usuario.',
        },
      ])
    }
  }

  function handleSplitTask(prompt: string) {
    const taskMatch = prompt.match(/tarea\s+"?([^"]+)"/i)
    
    if (taskMatch) {
      const taskName = taskMatch[1]
      
      setProposedChanges((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: 'split_task',
          title: `Dividir "${taskName}"`,
          description: `Dividir tarea "${taskName}" en sesiones más pequeñas`,
          reason: 'Tarea demasiado larga, recomendación de división.',
        },
      ])
    }
  }

  function handleAddBreak(prompt: string) {
    const durationMatch = prompt.match(/(\d+)\s*minutos?/i)
    const duration = durationMatch ? parseInt(durationMatch[1]) : 15
    
    setSuggestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: 'Añadir descanso',
        reason: `La tarde será más sostenible con una pausa de ${duration} minutos entre bloques largos.`,
        impact: 'low',
        type: 'schedule',
      },
    ])
  }

  async function handleApplyPlan() {
    setIsApplying(true)
    try {
      // Aquí iríamos a la API para aplicar los cambios
      console.log('Aplicando cambios propuestos:', proposedChanges)
      
      // Simulación de aplicación exitosa
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simular API call
      setProposedChanges([])
      setEvents([...events]) // Recargar eventos
      
      // Mostrar notificación de éxito
      alert('Cambios aplicados correctamente')
    } catch (error) {
      console.error('Error aplicando plan:', error)
      alert('Error al aplicar los cambios')
    } finally {
      setIsApplying(false)
    }
  }

  async function handleReplanDay() {
    setIsReplanning(true)
    try {
      // Aquí iríamos a la API para replanificar el día
      console.log('Replanificando día...')
      
      // Simulación de sugerencias de replanificación
      await new Promise(resolve => setTimeout(resolve, 1500)) // Simular API call
      setSuggestions((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: 'Añadir descanso corto',
          reason: 'La tarde será más sostenible con una pausa entre bloques largos.',
          impact: 'low',
          type: 'schedule',
        },
        {
          id: crypto.randomUUID(),
          title: 'Reorganizar tareas difíciles',
          reason: 'Mover tareas de alta dificultad a momentos de mayor energía.',
          impact: 'medium',
          type: 'task',
        },
      ])
    } catch (error) {
      console.error('Error replanificando día:', error)
    } finally {
      setIsReplanning(false)
    }
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
              freeHours: 3,
              pendingTasks: 3,
              urgentGoals: 1,
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
            isApplying={isApplying}
            isReplanning={isReplanning}
          />
        </div>
      </div>
    </div>
  )
}