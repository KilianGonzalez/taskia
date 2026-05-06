'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from '@fullcalendar/core'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import type { EventResizeDoneArg } from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { Lock } from 'lucide-react'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { getGoogleCalendarEventsInRange, updateFlexibleTask } from '@/app/actions'
import type {
  CalendarEvent,
  CalendarEventExtendedProps,
  CalendarTask,
} from '@/components/calendar/types'

interface CalendarProps {
  initialEvents: CalendarEvent[]
  flexibleTasks: CalendarTask[]
  onTaskUpdated?: (params: {
    taskId: string
    dueDate: string
    estimatedDurationMin?: number
  }) => void
}

type BlockedEditModalState = {
  title: string
  message: string
  isFixedCommitment: boolean
}

function getExtendedProps(
  extendedProps: Record<string, unknown>
): CalendarEventExtendedProps {
  return extendedProps as CalendarEventExtendedProps
}

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MIDNIGHT_ISO_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T00:00(?::00(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/

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

function formatLocalDateTime(dateValue: Date) {
  const year = dateValue.getFullYear()
  const month = String(dateValue.getMonth() + 1).padStart(2, '0')
  const day = String(dateValue.getDate()).padStart(2, '0')
  const hours = String(dateValue.getHours()).padStart(2, '0')
  const minutes = String(dateValue.getMinutes()).padStart(2, '0')
  const seconds = String(dateValue.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

function getNonEditableHint(extendedProps: CalendarEventExtendedProps) {
  if (extendedProps.source === 'google') {
    return 'Evento de Google Calendar. Editalo en Google Calendar para cambiarlo.'
  }

  const metadata = extendedProps.metadata
  const metadataSource =
    metadata &&
    typeof metadata === 'object' &&
    typeof (metadata as Record<string, unknown>).source === 'string'
      ? String((metadata as Record<string, unknown>).source)
      : ''

  const isFixedCommitment =
    extendedProps.source === 'scheduled_block' &&
    (extendedProps.blockType === 'fixed' ||
      Boolean(extendedProps.fixedCommitmentId) ||
      metadataSource === 'fixed_commitment' ||
      metadataSource === 'legacy_scheduled_block')

  if (isFixedCommitment) {
    return 'Compromiso fijo. Editalo desde la seccion "Compromisos" para actualizar este bloque.'
  }

  return 'Este bloque no es editable desde el calendario.'
}

export default function CalendarView({
  initialEvents,
  flexibleTasks,
  onTaskUpdated,
}: CalendarProps) {
  const router = useRouter()
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null)
  const [mirrorParent, setMirrorParent] = useState<HTMLElement | null>(null)
  const [blockedEditModal, setBlockedEditModal] = useState<BlockedEditModalState | null>(null)
  const [lockHint, setLockHint] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const lockHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [taskOverrides, setTaskOverrides] = useState<
    Record<string, { dueDate?: string; estimatedDurationMin?: number }>
  >({})
  const initialGoogleEvents = useMemo(
    () => initialEvents.filter((event) => event.extendedProps?.source === 'google'),
    [initialEvents]
  )
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>(initialGoogleEvents)
  const latestGoogleRequestId = useRef(0)
  const lastLoadedGoogleRangeKey = useRef<string | null>(null)

  const staticInitialEvents = useMemo(
    () => initialEvents.filter((event) => event.extendedProps?.source !== 'google'),
    [initialEvents]
  )

  useEffect(() => {
    setGoogleEvents(initialGoogleEvents)
  }, [initialGoogleEvents])

  useEffect(() => {
    setMirrorParent(document.body)
  }, [])

  useEffect(
    () => () => {
      if (lockHintTimerRef.current) {
        clearTimeout(lockHintTimerRef.current)
      }
    },
    []
  )

  const hideLockHint = () => {
    if (lockHintTimerRef.current) {
      clearTimeout(lockHintTimerRef.current)
      lockHintTimerRef.current = null
    }
    setLockHint(null)
  }

  const queueLockHint = (anchorElement: HTMLElement, text: string) => {
    hideLockHint()
    const rect = anchorElement.getBoundingClientRect()

    lockHintTimerRef.current = setTimeout(() => {
      setLockHint({
        text,
        x: rect.left + rect.width / 2,
        y: Math.max(14, rect.top - 8),
      })
      lockHintTimerRef.current = null
    }, 550)
  }

  useEffect(() => {
    const validTaskIds = new Set(flexibleTasks.map((task) => task.id))
    setTaskOverrides((currentOverrides) => {
      const nextOverrides = Object.entries(currentOverrides).reduce<
        Record<string, { dueDate?: string; estimatedDurationMin?: number }>
      >((accumulator, [taskId, override]) => {
        if (validTaskIds.has(taskId)) {
          accumulator[taskId] = override
        }
        return accumulator
      }, {})

      return Object.keys(nextOverrides).length === Object.keys(currentOverrides).length
        ? currentOverrides
        : nextOverrides
    })
  }, [flexibleTasks])

  const mergedTasks = useMemo(
    () =>
      flexibleTasks.map((task) => {
        const taskOverride = taskOverrides[task.id]
        if (!taskOverride) {
          return task
        }

        return {
          ...task,
          due_date: taskOverride.dueDate ?? task.due_date,
          estimated_duration_min:
            typeof taskOverride.estimatedDurationMin === 'number'
              ? taskOverride.estimatedDurationMin
              : task.estimated_duration_min,
        }
      }),
    [flexibleTasks, taskOverrides]
  )

  const handleDatesSet = async (dateInfo: DatesSetArg) => {
    const timeMin = new Date(dateInfo.start)
    const timeMax = new Date(dateInfo.end)

    timeMin.setDate(timeMin.getDate() - 7)
    timeMax.setDate(timeMax.getDate() + 7)

    const rangeKey = `${timeMin.toISOString()}|${timeMax.toISOString()}`
    if (rangeKey === lastLoadedGoogleRangeKey.current) {
      return
    }

    lastLoadedGoogleRangeKey.current = rangeKey
    const requestId = ++latestGoogleRequestId.current

    try {
      const result = await getGoogleCalendarEventsInRange({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
      })

      if (requestId !== latestGoogleRequestId.current) {
        return
      }

      if (result.status === 'ok' || result.status === 'disconnected') {
        setGoogleEvents(result.events)
        return
      }

      lastLoadedGoogleRangeKey.current = null
      console.error('Google Calendar sync returned an error status:', result.error)
    } catch (error) {
      if (requestId !== latestGoogleRequestId.current) {
        return
      }

      lastLoadedGoogleRangeKey.current = null
      console.error('Error loading Google Calendar events for visible range:', error)
    }
  }

  const handleEventClick = (clickInfo: EventClickArg) => {
    const extendedProps = getExtendedProps(clickInfo.event.extendedProps)
    const isNonEditable =
      clickInfo.event.startEditable === false && clickInfo.event.durationEditable === false

    if (isNonEditable) {
      const metadata = extendedProps.metadata
      const metadataSource =
        metadata &&
        typeof metadata === 'object' &&
        typeof (metadata as Record<string, unknown>).source === 'string'
          ? String((metadata as Record<string, unknown>).source)
          : ''

      const isFixedCommitment =
        extendedProps.source === 'scheduled_block' &&
        (extendedProps.blockType === 'fixed' ||
          Boolean(extendedProps.fixedCommitmentId) ||
          metadataSource === 'fixed_commitment' ||
          metadataSource === 'legacy_scheduled_block')

      const title = isFixedCommitment ? 'Compromiso fijo' : 'Bloque no editable'
      const message = isFixedCommitment
        ? 'Este bloque es fijo y no se puede modificar desde el calendario. Ve a la seccion "Compromisos" para editarlo.'
        : getNonEditableHint(extendedProps)

      hideLockHint()
      setBlockedEditModal({
        title,
        message,
        isFixedCommitment,
      })
      return
    }

    if (extendedProps.source !== 'flexible_task' || !extendedProps.taskId) {
      return
    }

    const task = mergedTasks.find((candidate) => candidate.id === extendedProps.taskId)
    if (task) {
      setSelectedTask(task)
    }
  }

  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const event = dropInfo.event
    const extendedProps = getExtendedProps(event.extendedProps)

    if (extendedProps.source !== 'flexible_task' || !extendedProps.taskId || !event.start) {
      dropInfo.revert()
      return
    }

    const taskId = extendedProps.taskId
    const newStart = event.start
    const nextDueDate = formatLocalDateTime(newStart)
    const previousTask = mergedTasks.find((task) => task.id === taskId)
    const previousDueDate = previousTask?.due_date

    console.log('Tarea movida:', {
      taskId,
      newStart: nextDueDate,
    })

    setTaskOverrides((currentOverrides) => ({
      ...currentOverrides,
      [taskId]: {
        ...currentOverrides[taskId],
        dueDate: nextDueDate,
      },
    }))
    onTaskUpdated?.({
      taskId,
      dueDate: nextDueDate,
    })

    try {
      const result = await updateFlexibleTask(taskId, {
        due_date: nextDueDate,
      })

      if (result.error) {
        setTaskOverrides((currentOverrides) => {
          const currentOverride = currentOverrides[taskId]
          if (!currentOverride) {
            return currentOverrides
          }

          if (!previousDueDate) {
            const nextOverrides = { ...currentOverrides }
            delete nextOverrides[taskId]
            return nextOverrides
          }

          return {
            ...currentOverrides,
            [taskId]: {
              ...currentOverride,
              dueDate: previousDueDate,
            },
          }
        })
        if (previousDueDate) {
          onTaskUpdated?.({
            taskId,
            dueDate: previousDueDate,
          })
        }
        alert(`Error al mover tarea: ${result.error}`)
        dropInfo.revert()
        return
      }
      console.log('Tarea movida exitosamente')
    } catch (error) {
      setTaskOverrides((currentOverrides) => {
        const currentOverride = currentOverrides[taskId]
        if (!currentOverride) {
          return currentOverrides
        }

        if (!previousDueDate) {
          const nextOverrides = { ...currentOverrides }
          delete nextOverrides[taskId]
          return nextOverrides
        }

        return {
          ...currentOverrides,
          [taskId]: {
            ...currentOverride,
            dueDate: previousDueDate,
          },
        }
      })
      if (previousDueDate) {
        onTaskUpdated?.({
          taskId,
          dueDate: previousDueDate,
        })
      }
      console.error('Error moviendo tarea:', error)
      alert('Error al mover tarea')
      dropInfo.revert()
    }
  }

  const handleEventResize = async (resizeInfo: EventResizeDoneArg) => {
    const event = resizeInfo.event
    const extendedProps = getExtendedProps(event.extendedProps)

    if (
      extendedProps.source !== 'flexible_task' ||
      !extendedProps.taskId ||
      !event.start ||
      !event.end
    ) {
      resizeInfo.revert()
      return
    }

    const taskId = extendedProps.taskId
    const newStart = event.start
    const newEnd = event.end
    const duration = (newEnd.getTime() - newStart.getTime()) / (1000 * 60)
    const nextDueDate = formatLocalDateTime(newStart)
    const nextDuration = Math.round(duration)
    const previousTask = mergedTasks.find((task) => task.id === taskId)
    const previousDueDate = previousTask?.due_date
    const previousDuration = previousTask?.estimated_duration_min

    console.log('Tarea redimensionada:', {
      taskId,
      newStart: nextDueDate,
      newEnd: formatLocalDateTime(newEnd),
      duration: nextDuration,
    })

    setTaskOverrides((currentOverrides) => ({
      ...currentOverrides,
      [taskId]: {
        ...currentOverrides[taskId],
        dueDate: nextDueDate,
        estimatedDurationMin: nextDuration,
      },
    }))
    onTaskUpdated?.({
      taskId,
      dueDate: nextDueDate,
      estimatedDurationMin: nextDuration,
    })

    try {
      const result = await updateFlexibleTask(taskId, {
        due_date: nextDueDate,
        estimated_duration_min: nextDuration,
      })

      if (result.error) {
        setTaskOverrides((currentOverrides) => ({
          ...currentOverrides,
          [taskId]: {
            ...currentOverrides[taskId],
            dueDate: previousDueDate,
            estimatedDurationMin: previousDuration,
          },
        }))
        if (previousDueDate) {
          onTaskUpdated?.({
            taskId,
            dueDate: previousDueDate,
            estimatedDurationMin: previousDuration,
          })
        }
        alert(`Error al cambiar duracion: ${result.error}`)
        resizeInfo.revert()
        return
      }

      console.log('Duracion cambiada exitosamente')
    } catch (error) {
      setTaskOverrides((currentOverrides) => ({
        ...currentOverrides,
        [taskId]: {
          ...currentOverrides[taskId],
          dueDate: previousDueDate,
          estimatedDurationMin: previousDuration,
        },
      }))
      if (previousDueDate) {
        onTaskUpdated?.({
          taskId,
          dueDate: previousDueDate,
          estimatedDurationMin: previousDuration,
        })
      }
      console.error('Error cambiando duracion:', error)
      alert('Error al cambiar duracion')
      resizeInfo.revert()
    }
  }

  const taskEvents = useMemo<CalendarEvent[]>(() => {
    console.log('Flexible tasks recibidas:', mergedTasks)

    const filteredTasks = mergedTasks.filter((task) => !task.completed && task.due_date)
    console.log('Tareas filtradas (no completadas y con due_date):', filteredTasks.length)

    const events: Array<CalendarEvent | null> = filteredTasks.map(
      (task): CalendarEvent | null => {
      const dueDate = parseDueDateForCalendar(task.due_date!)
      if (!dueDate) {
        return null
      }
      const duration = task.estimated_duration_min || 60

      console.log(`Procesando tarea "${task.title}":`, {
        due_date: task.due_date,
        dueDate: dueDate.toISOString(),
        hours: dueDate.getHours(),
        minutes: dueDate.getMinutes(),
      })

      let taskStart: Date
      if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
        taskStart = new Date(
          dueDate.getFullYear(),
          dueDate.getMonth(),
          dueDate.getDate(),
          9,
          0,
          0,
          0
        )
        console.log(`Tarea sin hora, asignando 9:00 AM: ${taskStart.toISOString()}`)
      } else {
        taskStart = new Date(dueDate)
        console.log(`Tarea con hora especÃ­fica: ${taskStart.toISOString()}`)
      }

      const taskEnd = new Date(taskStart.getTime() + duration * 60000)
      const isFromAI = Boolean(task.notes && task.notes.includes('Creada por IA'))

      console.log(`Evento creado para "${task.title}":`, {
        start: taskStart.toISOString(),
        end: taskEnd.toISOString(),
        isFromAI,
      })

      return {
        id: `task_${task.id}`,
        title: task.title,
        start: taskStart.toISOString(),
        end: taskEnd.toISOString(),
        backgroundColor: '#5f5ef1',
        borderColor: '#4a4ad8',
        textColor: '#ffffff',
        allDay: false,
        display: 'block',
        editable: true,
        durationEditable: true,
        startEditable: true,
        extendedProps: {
          source: 'flexible_task',
          category: task.category,
          priority: task.priority,
          duration,
          taskId: task.id,
          isFromAI,
        },
      }
      }
    )
    const normalizedEvents = events.filter(
      (event): event is CalendarEvent => event !== null
    )

    console.log('Eventos de tareas creados:', normalizedEvents.length)
    return normalizedEvents
  }, [mergedTasks])

  const allEvents = useMemo(() => {
    const nonEditableInitialEvents: CalendarEvent[] = [
      ...staticInitialEvents,
      ...googleEvents,
    ].map((event) => ({
      ...event,
      editable: false,
      durationEditable: false,
      startEditable: false,
    }))

    const combined = [...nonEditableInitialEvents, ...taskEvents]
    console.log('Eventos del calendario:', {
      initialEvents: staticInitialEvents.length + googleEvents.length,
      taskEvents: taskEvents.length,
      total: combined.length,
      taskEventsDetails: taskEvents.map((event) => ({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        isFromAI: event.extendedProps?.isFromAI,
      })),
    })
    return combined
  }, [googleEvents, staticInitialEvents, taskEvents])

  const renderEventContent = (eventInfo: EventContentArg) => {
    const extendedProps = getExtendedProps(eventInfo.event.extendedProps)
    const isGoogle = extendedProps.source === 'google'
    const isTask = extendedProps.source === 'flexible_task'
    const isFromAI = extendedProps.isFromAI
    const isNonEditable =
      eventInfo.event.startEditable === false && eventInfo.event.durationEditable === false
    const nonEditableHint = isNonEditable ? getNonEditableHint(extendedProps) : null

    const colors = isGoogle
      ? {
          bg: '#d1fae5',
          border: '#10b981',
          text: '#065f46',
        }
      : isTask
      ? {
          bg: '#5f5ef1',
          border: '#4a4ad8',
          text: '#ffffff',
        }
      : {
          bg: '#EEF2FF',
          border: '#6366F1',
          text: '#3730A3',
        }

    return (
      <div
        className={`relative flex h-full w-full flex-col overflow-hidden rounded-[6px] px-2 py-1 ${
          eventInfo.isMirror ? 'calendar-event-mirror-content' : 'cursor-pointer'
        }`}
        style={{
          backgroundColor: colors.bg,
          borderLeft: `3px solid ${colors.border}`,
        }}
      >
        {isNonEditable && nonEditableHint && !eventInfo.isMirror ? (
          <span
            className="calendar-event-lock"
            onMouseEnter={(event) =>
              queueLockHint(event.currentTarget as HTMLElement, nonEditableHint)
            }
            onMouseLeave={hideLockHint}
            onMouseDown={hideLockHint}
            aria-label={nonEditableHint}
          >
            <Lock className="h-[10px] w-[10px]" />
          </span>
        ) : null}
        <p
          className="truncate pr-4 text-[11px] font-semibold leading-tight"
          style={{ color: colors.text }}
        >
          {isGoogle && <span className="mr-1">{'\u{1F4C5}'}</span>}
          {isTask && isFromAI && <span className="mr-1">{'\u{1F916}'}</span>}
          {isTask && !isFromAI && <span className="mr-1">{'\u{1F4DD}'}</span>}
          {!isGoogle && !isTask && <span className="mr-1">{'\u{1F4CB}'}</span>}
          {eventInfo.event.title}
        </p>
        <p
          className="text-[10px] leading-tight mt-0.5 opacity-70"
          style={{ color: colors.text }}
        >
          {eventInfo.timeText}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="h-full w-full px-2 calendar-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          locales={[esLocale]}
          locale="es"
          events={allEvents}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          datesSet={handleDatesSet}
          editable={true}
          fixedMirrorParent={mirrorParent ?? undefined}
          selectable={true}
          height="100%"
          slotMinTime="06:00:00"
          slotMaxTime="24:00:00"
          allDaySlot={false}
          nowIndicator={true}
          expandRows={true}
          stickyHeaderDates={true}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventMinHeight={28}
          eventMinWidth={50}
          eventOverlap={false}
        />
      </div>

      {lockHint ? (
        <div
          className="calendar-lock-tooltip"
          style={{ left: lockHint.x, top: lockHint.y }}
          role="status"
          aria-live="polite"
        >
          {lockHint.text}
        </div>
      ) : null}

      {blockedEditModal && mirrorParent ? createPortal(
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setBlockedEditModal(null)}
          />
          <div className="app-modal relative w-full max-w-md space-y-4 p-6">
            <div>
              <h3 className="text-lg font-bold text-foreground">{blockedEditModal.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{blockedEditModal.message}</p>
            </div>

            <div className="flex justify-end gap-2">
              {blockedEditModal.isFixedCommitment ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedEditModal(null)
                    router.push('/dashboard/commitments')
                  }}
                  className="app-button-gradient"
                >
                  Ir a Compromisos
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setBlockedEditModal(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      , mirrorParent) : null}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          showCompleteButton={false}
        />
      )}
    </>
  )
}



