'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalendarView from '@/components/calendar/CalendarView'
import { AiCommandBar } from '@/components/ai/AiCommandBar'
import { AiPlannerPanel } from '@/components/ai/AiPlannerPanel'
import type { AiChange, AiConflict, AiSuggestion } from '@/components/ai/ai-types'
import type { CalendarEvent, CalendarTask } from '@/components/calendar/types'
import {
  createTask,
  createTasksFromSplitTask,
  splitTaskWithAI,
  updateFlexibleTask,
  parseNaturalLanguageTask,
} from '@/app/actions'
import { isHighTaskPriority } from '@/lib/tasks/priority'

type CalendarAiShellProps = {
  initialEvents: CalendarEvent[]
  flexibleTasks: CalendarTask[]
  googleInitiallyConnected?: boolean
}

type CalendarWindow = {
  id: string
  title: string
  start: Date
  end: Date
}

type SuggestedSplitSession = {
  title: string
  durationMin: number
  focus: string
  reason: string
  suggestedTime?: string
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIDNIGHT_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractQuotedText(value: string) {
  const match = value.match(/["']([^"']+)["']/)
  return match?.[1]?.trim() ?? null
}

function findTaskByPrompt(prompt: string, tasks: CalendarTask[]) {
  const normalizedPrompt = normalizeSearchText(prompt)
  const quotedTaskTitle = extractQuotedText(prompt)

  if (quotedTaskTitle) {
    const normalizedQuotedTitle = normalizeSearchText(quotedTaskTitle)
    const exactMatch =
      tasks.find(
        (task) => normalizeSearchText(task.title) === normalizedQuotedTitle
      ) ??
      tasks.find((task) =>
        normalizeSearchText(task.title).includes(normalizedQuotedTitle)
      )

    if (exactMatch) {
      return exactMatch
    }
  }

  const directMatches = tasks.filter((task) =>
    normalizedPrompt.includes(normalizeSearchText(task.title))
  )

  if (directMatches.length > 0) {
    return directMatches.sort((firstTask, secondTask) => {
      const firstTitleLength = normalizeSearchText(firstTask.title).length
      const secondTitleLength = normalizeSearchText(secondTask.title).length
      return secondTitleLength - firstTitleLength
    })[0]
  }

  const promptTokens = normalizedPrompt
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)

  const stopWords = new Set([
    'mueve', 'mover', 'tarea', 'bloque', 'las', 'para', 'hoy',
    'manana', 'mañana', 'hora', 'horas', 'min', 'minutos',
    'a', 'la', 'el', 'de', 'del', 'y',
  ])

  const filteredPromptTokens = promptTokens.filter((token) => !stopWords.has(token))

  if (filteredPromptTokens.length === 0) {
    return null
  }

  let bestTask: CalendarTask | null = null
  let bestScore = 0

  for (const task of tasks) {
    const taskTokens = normalizeSearchText(task.title)
      .split(/[^a-z0-9]+/g)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3)

    const overlap = filteredPromptTokens.filter((token) =>
      taskTokens.some((taskToken) => taskToken.includes(token) || token.includes(taskToken))
    ).length

    if (overlap > bestScore) {
      bestScore = overlap
      bestTask = task
    }
  }

  return bestScore > 0 ? bestTask : null
}

function parseTime(prompt: string) {
  const normalizedPrompt = normalizeSearchText(prompt)
  const explicitTimeMatch = normalizedPrompt.match(
    /\ba\s*las?\s*(\d{1,2})(?::(\d{2}))?\b/
  )

  const fallbackMatches = [...normalizedPrompt.matchAll(/\b(\d{1,2})(?::(\d{2}))\b/g)]
  const fallbackMatch =
    fallbackMatches.length > 0 ? fallbackMatches[fallbackMatches.length - 1] : null

  const simpleHourMatches = [...normalizedPrompt.matchAll(/\b(\d{1,2})\s*h(?:oras?)?\b/g)]
  const simpleHourMatch =
    simpleHourMatches.length > 0
      ? simpleHourMatches[simpleHourMatches.length - 1]
      : null

  const match = explicitTimeMatch ?? fallbackMatch ?? simpleHourMatch
  if (!match) {
    return null
  }

  const hours = Number(match[1])
  const minutes = Number(match[2] ?? '0')

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return { hours, minutes }
}

function parseDuration(prompt: string) {
  const match = prompt.match(/(\d+)\s*(?:min|mins|minuto|minutos|minutes?)/i)
  if (!match) {
    return null
  }

  const duration = Number(match[1])
  return Number.isFinite(duration) && duration > 0 ? duration : null
}

function formatLocalDateTime(dateValue: Date) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  const hours = String(dateValue.getHours()).padStart(2, '0')
  const minutes = String(dateValue.getMinutes()).padStart(2, '0')
  const seconds = String(dateValue.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function parseExplicitDate(prompt: string) {
  const normalizedPrompt = normalizeSearchText(prompt)
  const dateMatch = normalizedPrompt.match(
    /\b(?:el\s+)?(?:dia\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/
  )

  if (!dateMatch) {
    return null
  }

  const day = Number(dateMatch[1])
  const month = Number(dateMatch[2])
  const yearInput = dateMatch[3]
  const currentYear = new Date().getFullYear()
  const year = yearInput
    ? yearInput.length === 2
      ? 2000 + Number(yearInput)
      : Number(yearInput)
    : currentYear

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year) ||
    day < 1 ||
    day > 31 ||
    month < 1 ||
    month > 12
  ) {
    return null
  }

  const explicitDate = new Date(year, month - 1, day, 0, 0, 0, 0)
  if (
    explicitDate.getFullYear() !== year ||
    explicitDate.getMonth() !== month - 1 ||
    explicitDate.getDate() !== day
  ) {
    return null
  }

  return explicitDate
}

function resolveRequestedDayOffset(prompt: string) {
  const normalizedPrompt = normalizeSearchText(prompt)

  if (normalizedPrompt.includes('pasado manana')) {
    return 2
  }

  if (
    normalizedPrompt.includes('manana') ||
    normalizedPrompt.includes('tomorrow')
  ) {
    return 1
  }

  if (normalizedPrompt.includes('hoy') || normalizedPrompt.includes('today')) {
    return 0
  }

  return null
}

function getNextOccurrence(hours: number, minutes: number, prompt?: string) {
  const explicitDate = prompt ? parseExplicitDate(prompt) : null
  if (explicitDate) {
    explicitDate.setHours(hours, minutes, 0, 0)
    return formatLocalDateTime(explicitDate)
  }

  const requestedDayOffset = prompt ? resolveRequestedDayOffset(prompt) : null
  const nextDate = new Date()
  nextDate.setSeconds(0, 0)
  nextDate.setHours(hours, minutes, 0, 0)

  if (requestedDayOffset !== null) {
    nextDate.setDate(nextDate.getDate() + requestedDayOffset)
    return formatLocalDateTime(nextDate)
  }

  if (nextDate.getTime() <= Date.now()) {
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return formatLocalDateTime(nextDate)
}

function hasDateConstraintInPrompt(prompt: string) {
  return (
    parseExplicitDate(prompt) !== null ||
    resolveRequestedDayOffset(prompt) !== null
  )
}

function parseDueDateForCalendar(dueDateValue: string) {
  const trimmedDueDate = dueDateValue.trim()
  const dateOnlyMatch = trimmedDueDate.match(DATE_ONLY_PATTERN)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return new Date(Number(year), Number(month) - 1, Number(day), 9, 0, 0, 0)
  }

  const midnightMatch = trimmedDueDate.match(MIDNIGHT_ISO_PATTERN)
  if (midnightMatch) {
    const [, year, month, day] = midnightMatch
    return new Date(Number(year), Number(month) - 1, Number(day), 9, 0, 0, 0)
  }

  const parsedDate = new Date(trimmedDueDate)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function getTaskStartDate(task: CalendarTask) {
  if (!task.due_date) {
    return null
  }

  return parseDueDateForCalendar(task.due_date)
}

function formatDateTime(dateValue: string) {
  return new Date(dateValue).toLocaleString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTaskWindow(task: CalendarTask): CalendarWindow | null {
  const start = getTaskStartDate(task)
  if (!start) {
    return null
  }

  const duration = task.estimated_duration_min ?? 60
  const end = new Date(start.getTime() + duration * 60 * 1000)

  return {
    id: `task_${task.id}`,
    title: task.title,
    start,
    end,
  }
}

function getEventWindow(event: CalendarEvent): CalendarWindow | null {
  const start = new Date(event.start)
  const end = new Date(event.end)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null
  }

  return {
    id: event.id,
    title: event.title,
    start,
    end,
  }
}

function isSameCalendarDay(firstDate: Date, secondDate: Date) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  )
}

function buildSuggestions(tasks: CalendarTask[]) {
  const pendingTasks = tasks.filter((task) => !task.completed)
  const suggestions: AiSuggestion[] = []

  const unscheduledTask = pendingTasks.find((task) => !task.due_date)
  if (unscheduledTask) {
    suggestions.push({
      id: `schedule-${unscheduledTask.id}`,
      title: `Programar "${unscheduledTask.title}"`,
      reason: 'No tiene hora asignada. Puedes reservarle un hueco de enfoque.',
      impact: 'medium',
      type: 'task',
      ctaLabel: 'Añadir al plan',
      metadata: {
        operation: 'move_task',
        taskId: unscheduledTask.id,
        dueDate: getNextOccurrence(9, 0),
      },
    })
  }

  const longTask = pendingTasks.find(
    (task) => (task.estimated_duration_min ?? 0) >= 90
  )
  if (longTask) {
    suggestions.push({
      id: `split-${longTask.id}`,
      title: `Dividir "${longTask.title}"`,
      reason: 'Supera los 90 minutos y conviene convertirla en sesiones manejables.',
      impact: 'medium',
      type: 'task',
      ctaLabel: 'Dividir',
      metadata: {
        operation: 'split_task',
        taskId: longTask.id,
        taskTitle: longTask.title,
      },
    })
  }

  const highPriorityTask = pendingTasks.find((task) => isHighTaskPriority(task.priority))
  if (highPriorityTask) {
    suggestions.push({
      id: `focus-${highPriorityTask.id}`,
      title: `Reservar foco para "${highPriorityTask.title}"`,
      reason: 'Es una tarea prioritaria. Adelantarla reduce riesgo para el resto del día.',
      impact: 'high',
      type: 'schedule',
      ctaLabel: 'Proponer',
      metadata: {
        operation: 'move_task',
        taskId: highPriorityTask.id,
        dueDate: getNextOccurrence(9, 0),
      },
    })
  }

  return suggestions.slice(0, 3)
}

function buildConflicts(events: CalendarEvent[], tasks: CalendarTask[]) {
  const today = new Date()
  const windows = [
    ...events.map(getEventWindow).filter(Boolean),
    ...tasks.map(getTaskWindow).filter(Boolean),
  ]
    .filter((window): window is CalendarWindow => Boolean(window))
    .filter((window) => isSameCalendarDay(window.start, today))
    .sort((firstWindow, secondWindow) => firstWindow.start.getTime() - secondWindow.start.getTime())

  const conflicts: AiConflict[] = []

  for (let index = 0; index < windows.length - 1; index += 1) {
    const currentWindow = windows[index]
    const nextWindow = windows[index + 1]

    if (currentWindow.end <= nextWindow.start) {
      continue
    }

    const overlapMinutes = Math.round(
      (currentWindow.end.getTime() - nextWindow.start.getTime()) / (1000 * 60)
    )

    conflicts.push({
      id: `${currentWindow.id}-${nextWindow.id}`,
      title: 'Solapamiento de horarios',
      description: `"${currentWindow.title}" y "${nextWindow.title}" se pisan ${overlapMinutes} min.`,
      severity: overlapMinutes >= 30 ? 'high' : 'medium',
    })
  }

  return conflicts.slice(0, 3)
}

function buildTodaySummary(events: CalendarEvent[], tasks: CalendarTask[]) {
  const today = new Date()
  const windows = [
    ...events.map(getEventWindow).filter(Boolean),
    ...tasks.map(getTaskWindow).filter(Boolean),
  ]
    .filter((window): window is CalendarWindow => Boolean(window))
    .filter((window) => isSameCalendarDay(window.start, today))
    .sort((firstWindow, secondWindow) => firstWindow.start.getTime() - secondWindow.start.getTime())

  const mergedWindows: CalendarWindow[] = []

  windows.forEach((window) => {
    const lastMergedWindow = mergedWindows[mergedWindows.length - 1]
    if (!lastMergedWindow || window.start > lastMergedWindow.end) {
      mergedWindows.push({ ...window })
      return
    }

    if (window.end > lastMergedWindow.end) {
      lastMergedWindow.end = window.end
    }
  })

  const occupiedMinutes = mergedWindows.reduce((totalMinutes, window) => {
    return totalMinutes + (window.end.getTime() - window.start.getTime()) / (1000 * 60)
  }, 0)

  const freeHours = Math.max(0, Math.round((12 * 60 - occupiedMinutes) / 60))

  return {
    freeHours,
    pendingTasks: tasks.filter((task) => !task.completed).length,
    urgentGoals: tasks.filter(
      (task) => !task.completed && isHighTaskPriority(task.priority)
    ).length,
  }
}

function getChangeMetadata(change: AiChange) {
  return (change.metadata ?? {}) as {
    operation?: string
    taskId?: string
    taskTitle?: string
    title?: string
    dueDate?: string
    estimatedDurationMin?: number
    sessions?: SuggestedSplitSession[]
  }
}

export function CalendarAiShell({
  initialEvents,
  flexibleTasks,
  googleInitiallyConnected = true,
}: CalendarAiShellProps) {
  const router = useRouter()
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>(flexibleTasks)
  const [proposedChanges, setProposedChanges] = useState<AiChange[]>([])
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>(() =>
    buildSuggestions(flexibleTasks)
  )
  const [isApplying, setIsApplying] = useState(false)
  const [isReplanning, setIsReplanning] = useState(false)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error'
    message: string
  } | null>(null)

  const todaySummary = useMemo(
    () => buildTodaySummary(initialEvents, calendarTasks),
    [calendarTasks, initialEvents]
  )

  const conflicts = useMemo(
    () => buildConflicts(initialEvents, calendarTasks),
    [calendarTasks, initialEvents]
  )

  const pendingTasks = useMemo(
    () => calendarTasks.filter((task) => !task.completed),
    [calendarTasks]
  )

  useEffect(() => {
    setCalendarTasks(flexibleTasks)
  }, [flexibleTasks])

  useEffect(() => {
    setSuggestions(buildSuggestions(calendarTasks))
  }, [calendarTasks])

  function handleCalendarTaskUpdated(params: {
    taskId: string
    dueDate: string
    estimatedDurationMin?: number
  }) {
    setCalendarTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === params.taskId
          ? {
              ...task,
              due_date: params.dueDate,
              estimated_duration_min:
                typeof params.estimatedDurationMin === 'number'
                  ? params.estimatedDurationMin
                  : task.estimated_duration_min,
            }
          : task
      )
    )
  }

  function pushChange(change: AiChange) {
    setProposedChanges((currentChanges) => [...currentChanges, change])
    setFeedback({
      tone: 'success',
      message: 'He añadido el cambio al borrador del plan.',
    })
  }

  async function createSplitProposal(task: CalendarTask) {
    const result = await splitTaskWithAI(task.id)

    if (result.error || !result.data?.sessions?.length) {
      setFeedback({
        tone: 'error',
        message: result.error ?? 'No se pudo dividir la tarea seleccionada.',
      })
      return
    }

    pushChange({
      id: crypto.randomUUID(),
      type: 'split_task',
      title: `Dividir "${task.title}"`,
      description: `Crear ${result.data.sessions.length} sesiones para repartir mejor la carga.`,
      reason: result.data.summary || 'La tarea es demasiado larga para un bloque único.',
      affectedIds: [task.id],
      metadata: {
        operation: 'split_task',
        taskId: task.id,
        taskTitle: task.title,
        sessions: result.data.sessions,
      },
    })
  }

  function analyzeCommand(prompt: string) {
    const normalizedPrompt = normalizeSearchText(prompt)

    if (
      normalizedPrompt.includes('replanifica') ||
      normalizedPrompt.includes('reorganiza') ||
      normalizedPrompt.includes('optimiza')
    ) {
      return 'replan_day'
    }

    if (
      normalizedPrompt.includes('mueve') ||
      normalizedPrompt.includes('move') ||
      normalizedPrompt.includes('cambia') ||
      normalizedPrompt.includes('reagenda') ||
      normalizedPrompt.includes('programa') ||
      normalizedPrompt.includes('agenda')
    ) {
      return 'move_block'
    }

    if (
      normalizedPrompt.includes('divide') ||
      normalizedPrompt.includes('split') ||
      normalizedPrompt.includes('sesion')
    ) {
      return 'split_task'
    }

    if (
      normalizedPrompt.includes('descanso') ||
      normalizedPrompt.includes('pausa') ||
      normalizedPrompt.includes('break')
    ) {
      return 'add_break'
    }

    if (
      normalizedPrompt.includes('crea') ||
      normalizedPrompt.includes('anade') ||
      normalizedPrompt.includes('añade') ||
      normalizedPrompt.includes('nuevo')
    ) {
      return 'create_block'
    }

    return 'generic'
  }

  async function handleMoveBlock(prompt: string) {
    const selectedTask =
      findTaskByPrompt(prompt, pendingTasks) ??
      (pendingTasks.length === 1 ? pendingTasks[0] : null)
    const parsedTime = parseTime(prompt)

    if (!selectedTask || !parsedTime) {
      setFeedback({
        tone: 'error',
        message:
          pendingTasks.length === 1
            ? 'Necesito una hora valida para mover la tarea pendiente.'
            : 'Necesito una tarea y una hora valida para moverla.',
      })
      return
    }

    const shouldKeepTaskDay =
      !hasDateConstraintInPrompt(prompt) && Boolean(selectedTask.due_date)

    let dueDate: string
    if (shouldKeepTaskDay) {
      const currentTaskDate = parseDueDateForCalendar(selectedTask.due_date!)
      if (!currentTaskDate) {
        setFeedback({
          tone: 'error',
          message: 'No pude leer la fecha actual de la tarea para mantener el mismo día.',
        })
        return
      }

      currentTaskDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0)
      dueDate = formatLocalDateTime(currentTaskDate)
    } else {
      dueDate = getNextOccurrence(
        parsedTime.hours,
        parsedTime.minutes,
        prompt
      )
    }

    const result = await updateFlexibleTask(selectedTask.id, {
      due_date: dueDate,
    })

    if (result.error) {
      setFeedback({
        tone: 'error',
        message: result.error,
      })
      return
    }

    setFeedback({
      tone: 'success',
      message: `He movido "${selectedTask.title}" a ${formatDateTime(dueDate)}.`,
    })
    handleCalendarTaskUpdated({
      taskId: selectedTask.id,
      dueDate,
    })
  }

  async function handleCreateBlock(prompt: string) {
    const parsed = await parseNaturalLanguageTask(prompt)

    if ('error' in parsed) {
      setFeedback({ tone: 'error', message: parsed.error })
      return
    }

    const { title, date, time, durationMin, priority } = parsed.data

    let dueDate: string
    if (date && time) {
      dueDate = `${date}T${time}:00`
    } else if (date) {
      dueDate = `${date}T09:00:00`
    } else if (time) {
      const [h, m] = time.split(':').map(Number)
      dueDate = getNextOccurrence(h, m, prompt)
    } else {
      dueDate = getNextOccurrence(9, 0, prompt)
    }

    const result = await createTask({
      title,
      category: 'general',
      due_date: dueDate,
      estimated_duration_min: durationMin ?? 60,
      priority: priority ?? 'media',
      notes: 'Creada por IA desde calendario',
    })

    if (result.error) {
      setFeedback({ tone: 'error', message: result.error })
      return
    }

    setFeedback({
      tone: 'success',
      message: `He creado "${title}" para ${formatDateTime(dueDate)} (${durationMin ?? 60} min).`,
    })
    router.refresh()
  }

  async function handleSplitTask(prompt: string) {
    const selectedTask = findTaskByPrompt(prompt, pendingTasks)

    if (!selectedTask) {
      setFeedback({
        tone: 'error',
        message: 'No encontré la tarea que quieres dividir.',
      })
      return
    }

    await createSplitProposal(selectedTask)
  }

  async function handleAddBreak(prompt: string) {
    const duration = parseDuration(prompt) ?? 15

    setSuggestions((currentSuggestions) => [
      {
        id: crypto.randomUUID(),
        title: `Añadir descanso de ${duration} min`,
        reason: 'Puede ayudarte a bajar la fatiga entre bloques intensos.',
        impact: 'low',
        type: 'schedule',
        ctaLabel: 'Guardar idea',
        metadata: {
          operation: 'break',
          duration,
        },
      },
      ...currentSuggestions,
    ])

    setFeedback({
      tone: 'success',
      message: `He generado una sugerencia de descanso de ${duration} minutos.`,
    })
  }

  async function handleSubmit(prompt: string) {
    setIsProcessingCommand(true)
    setFeedback(null)

    try {
      const commandType = analyzeCommand(prompt)

      switch (commandType) {
        case 'move_block':
          await handleMoveBlock(prompt)
          break
        case 'create_block':
          await handleCreateBlock(prompt)
          break
        case 'split_task':
          await handleSplitTask(prompt)
          break
        case 'add_break':
          await handleAddBreak(prompt)
          break
        case 'replan_day':
          await handleReplanDay()
          break
        default:
          setFeedback({
            tone: 'error',
            message:
              'Prueba con algo como "Mueve tarea \'Repasar\' a las 16:00" o "Crear tarea \'Resumen\' a las 10:00 por 45 minutos".',
          })
      }
    } finally {
      setIsProcessingCommand(false)
    }
  }

  async function handleApplyPlan() {
    setIsApplying(true)

    try {
      let appliedChanges = 0
      const failedChanges: string[] = []

      for (const change of proposedChanges) {
        const metadata = getChangeMetadata(change)

        if (metadata.operation === 'move_task' && metadata.taskId && metadata.dueDate) {
          const result = await updateFlexibleTask(metadata.taskId, {
            due_date: metadata.dueDate,
          })

          if (result.error) {
            failedChanges.push(result.error)
            continue
          }

          appliedChanges += 1
          continue
        }

        if (
          metadata.operation === 'create_task' &&
          metadata.title &&
          metadata.dueDate
        ) {
          const result = await createTask({
            title: metadata.title,
            category: 'general',
            due_date: metadata.dueDate,
            estimated_duration_min: metadata.estimatedDurationMin ?? 60,
            priority: 'media',
            notes: 'Creada por IA desde calendario',
          })

          if (result.error) {
            failedChanges.push(result.error)
            continue
          }

          appliedChanges += 1
          continue
        }

        if (
          metadata.operation === 'split_task' &&
          metadata.taskId &&
          metadata.taskTitle &&
          Array.isArray(metadata.sessions) &&
          metadata.sessions.length > 0
        ) {
          const result = await createTasksFromSplitTask({
            originalTaskId: metadata.taskId,
            originalTaskTitle: metadata.taskTitle,
            sessions: metadata.sessions,
          })

          if (result.error) {
            failedChanges.push(result.error)
            continue
          }

          appliedChanges += 1
          continue
        }

        if (change.type === 'insert_break') {
          appliedChanges += 1
        }
      }

      if (failedChanges.length > 0) {
        setFeedback({
          tone: 'error',
          message: failedChanges[0],
        })
        return
      }

      setProposedChanges([])
      setFeedback({
        tone: 'success',
        message:
          appliedChanges > 0
            ? `Se aplicaron ${appliedChanges} cambios del plan.`
            : 'No había cambios persistibles que aplicar.',
      })
      router.refresh()
    } catch (error) {
      console.error('Error aplicando plan:', error)
      setFeedback({
        tone: 'error',
        message: 'Error al aplicar los cambios propuestos.',
      })
    } finally {
      setIsApplying(false)
    }
  }

  async function handleReplanDay() {
    setIsReplanning(true)

    try {
      const nextSuggestions = buildSuggestions(calendarTasks)
      setSuggestions(nextSuggestions)
      setFeedback({
        tone: 'success',
        message:
          nextSuggestions.length > 0
            ? 'He recalculado sugerencias en función de tus tareas actuales.'
            : 'Hoy no veo ajustes claros que merezcan replanificación.',
      })
    } finally {
      setIsReplanning(false)
    }
  }

  async function handleAcceptSuggestion(suggestion: AiSuggestion) {
    const operation = suggestion.metadata?.operation

    if (operation === 'split_task') {
      const taskId = suggestion.metadata?.taskId
      const task = pendingTasks.find((candidate) => candidate.id === taskId)
      if (task) {
        await createSplitProposal(task)
      }
    } else if (operation === 'move_task') {
      pushChange({
        id: crypto.randomUUID(),
        type: 'move_block',
        title: suggestion.title,
        description: suggestion.reason,
        reason: 'Aceptado desde sugerencias IA.',
        affectedIds:
          typeof suggestion.metadata?.taskId === 'string'
            ? [suggestion.metadata.taskId]
            : undefined,
        metadata: suggestion.metadata,
      })
    } else {
      pushChange({
        id: crypto.randomUUID(),
        type: 'insert_break',
        title: suggestion.title,
        description: suggestion.reason,
        reason: 'Idea aceptada desde sugerencias IA.',
      })
    }

    setSuggestions((currentSuggestions) =>
      currentSuggestions.filter((currentSuggestion) => currentSuggestion.id !== suggestion.id)
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi calendario</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Visualiza, gestiona y ajusta tu semana con ayuda de la IA
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
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

      <AiCommandBar
        onSubmit={handleSubmit}
        isLoading={isProcessingCommand}
        suggestions={[
          "Mueve tarea Repasar historia a las 16:00",
          "Crea examen de química el jueves a las 10:00 durante 45 minutos",
          "Divide tarea Proyecto final",
        ]}
      />

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'error'
              ? 'border-red-200/70 bg-red-50/70 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
              : 'border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {proposedChanges.length > 0 ? (
        <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50/70 px-4 py-3 flex items-center justify-between gap-4 dark:border-indigo-900 dark:bg-indigo-950/30">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            {proposedChanges.length}{' '}
            {proposedChanges.length === 1 ? 'cambio pendiente' : 'cambios pendientes'} en el plan
          </p>
          <button
            onClick={() => void handleApplyPlan()}
            disabled={isApplying}
            className="brand-gradient px-4 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
          >
            {isApplying ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Aplicando...
              </>
            ) : (
              'Aplicar plan'
            )}
          </button>
        </div>
      ) : null}

      <div className="grid flex-1 min-h-0 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="app-card min-h-0 overflow-hidden">
          <CalendarView
            initialEvents={initialEvents}
            flexibleTasks={calendarTasks}
            onTaskUpdated={handleCalendarTaskUpdated}
            googleInitiallyConnected={googleInitiallyConnected}
          />
        </div>

        <div className="min-h-0 overflow-y-auto">
          <AiPlannerPanel
            suggestions={suggestions}
            conflicts={conflicts}
            onAcceptSuggestion={(suggestion) => {
              void handleAcceptSuggestion(suggestion)
            }}
          />
        </div>
      </div>
    </div>
  )
}
