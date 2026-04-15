'use client'

import { useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { updateFlexibleTask } from '@/app/actions'

interface CalendarProps {
  initialEvents: any[]
  flexibleTasks: any[]
}

interface Task {
  id: string
  title: string
  category?: string
  priority?: string
  due_date?: string
  estimated_duration_min?: number
  difficulty?: number
  notes?: string
  completed: boolean
  completed_at?: string
  created_at: string
}

// Paleta de colores por categoría (puedes ampliarla)
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  default:    { bg: '#EEF2FF', border: '#6366F1', text: '#3730A3' },
  deporte:    { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  estudio:    { bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
  musica:     { bg: '#FDF4FF', border: '#D946EF', text: '#A21CAF' },
  ocio:       { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1' },
  study:      { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
}

export default function CalendarView({ initialEvents, flexibleTasks }: CalendarProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Manejador de clic en eventos
  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event
    const isTask = event.extendedProps?.source === 'flexible_task'
    
    if (isTask && event.extendedProps?.taskId) {
      // Encontrar la tarea completa
      const task = flexibleTasks.find((t: any) => t.id === event.extendedProps.taskId)
      if (task) {
        setSelectedTask(task)
      }
    }
  }

  // Manejador para cuando se mueve/arrastra un evento
  const handleEventDrop = async (dropInfo: any) => {
    const event = dropInfo.event
    const isTask = event.extendedProps?.source === 'flexible_task'
    
    if (isTask && event.extendedProps?.taskId) {
      const taskId = event.extendedProps.taskId
      const newStart = event.start
      
      console.log('Tarea movida:', {
        taskId,
        newStart: newStart.toISOString()
      })
      
      try {
        // Llamar a la API para actualizar la fecha de la tarea
        const result = await updateFlexibleTask(taskId, {
          due_date: newStart.toISOString()
        })
        
        if (result.error) {
          alert(`Error al mover tarea: ${result.error}`)
        } else {
          // Éxito - podríamos mostrar una notificación más elegante
          console.log('Tarea movida exitosamente')
        }
      } catch (error) {
        console.error('Error moviendo tarea:', error)
        alert('Error al mover tarea')
      }
    }
  }

  // Manejador para cuando se redimensiona un evento (cambia duración)
  const handleEventResize = async (resizeInfo: any) => {
    const event = resizeInfo.event
    const isTask = event.extendedProps?.source === 'flexible_task'
    
    if (isTask && event.extendedProps?.taskId) {
      const taskId = event.extendedProps.taskId
      const newStart = event.start
      const newEnd = event.end
      const duration = (newEnd - newStart) / (1000 * 60) // duración en minutos
      
      console.log('Tarea redimensionada:', {
        taskId,
        newStart: newStart.toISOString(),
        newEnd: newEnd.toISOString(),
        duration: Math.round(duration)
      })
      
      try {
        // Llamar a la API para actualizar la duración de la tarea
        const result = await updateFlexibleTask(taskId, {
          due_date: newStart.toISOString(),
          estimated_duration_min: Math.round(duration)
        })
        
        if (result.error) {
          alert(`Error al cambiar duración: ${result.error}`)
        } else {
          console.log('Duración cambiada exitosamente')
        }
      } catch (error) {
        console.error('Error cambiando duración:', error)
        alert('Error al cambiar duración')
      }
    }
  }

  // Convertir flexibleTasks a eventos del calendario (como tareas pendientes)
  const taskEvents = useMemo(() => {
    console.log('Flexible tasks recibidas:', flexibleTasks)
    
    const filteredTasks = flexibleTasks.filter((task: any) => !task.completed && task.due_date)
    console.log('Tareas filtradas (no completadas y con due_date):', filteredTasks.length)
    
    const events = filteredTasks.map((task: any) => {
        const dueDate = new Date(task.due_date!)
        const duration = task.estimated_duration_min || 60
        
        console.log(`Procesando tarea "${task.title}":`, {
          due_date: task.due_date,
          dueDate: dueDate.toISOString(),
          hours: dueDate.getHours(),
          minutes: dueDate.getMinutes()
        })
        
        // Para vistas de semana y día, poner la tarea a una hora razonable (9:00 AM)
        // si la fecha de vencimiento no tiene hora específica
        let taskStart: Date
        if (task.notes && task.notes.includes('Creada por IA')) {
          // Si es una tarea de IA, considerar que no tiene hora específica
          taskStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 9, 0, 0, 0)
          console.log(`Tarea de IA sin hora, asignando 9:00 AM: ${taskStart.toISOString()}`)
        } else if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0) {
          // Si es medianoche (sin hora específica), crear nueva fecha a las 9:00 AM
          taskStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 9, 0, 0, 0)
          console.log(`Tarea sin hora, asignando 9:00 AM: ${taskStart.toISOString()}`)
        } else {
          // Si tiene hora específica, usar la fecha original
          taskStart = new Date(dueDate)
          console.log(`Tarea con hora específica: ${taskStart.toISOString()}`)
        }
        
        const taskEnd = new Date(taskStart.getTime() + duration * 60000)
        
        // Verificar si es una tarea creada por IA
        const isFromAI = task.notes && task.notes.includes('Creada por IA')
        
        console.log(`Evento creado para "${task.title}":`, {
          start: taskStart.toISOString(),
          end: taskEnd.toISOString(),
          isFromAI
        })
        
        return {
          id: `task_${task.id}`,
          title: task.title,
          start: taskStart.toISOString(),
          end: taskEnd.toISOString(),
          backgroundColor: isFromAI ? '#5f5ef1' : (categoryColors[task.category || 'default']?.bg || categoryColors.default.bg),
          borderColor: isFromAI ? '#4a4ad8' : (categoryColors[task.category || 'default']?.border || categoryColors.default.border),
          textColor: isFromAI ? '#ffffff' : (categoryColors[task.category || 'default']?.text || categoryColors.default.text),
          allDay: false, // Asegurarse de que no sea allDay para vistas de tiempo
          display: 'block', // Asegurar que se muestre en todas las vistas
          editable: true, // Solo las tareas del usuario son editables
          durationEditable: true, // Permitir cambiar duración
          startEditable: true, // Permitir cambiar hora de inicio
          extendedProps: {
            source: 'flexible_task',
            category: task.category,
            priority: task.priority,
            duration: duration,
            taskId: task.id,
            isFromAI: isFromAI,
          },
        }
      })
    
    console.log('Eventos de tareas creados:', events.length)
    return events
  }, [flexibleTasks])

  // Combinar eventos programados con tareas flexibles
  const allEvents = useMemo(() => {
    // Asegurar que los eventos iniciales (Google Calendar) no sean editables
    const nonEditableInitialEvents = initialEvents.map(event => ({
      ...event,
      editable: false, // Bloquear edición de eventos externos
      durationEditable: false,
      startEditable: false
    }))
    
    const combined = [...nonEditableInitialEvents, ...taskEvents]
    console.log('Eventos del calendario:', {
      initialEvents: initialEvents.length,
      taskEvents: taskEvents.length,
      total: combined.length,
      taskEventsDetails: taskEvents.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        isFromAI: e.extendedProps?.isFromAI
      }))
    })
    return combined
  }, [initialEvents, taskEvents])

  const renderEventContent = (eventInfo: any) => {
    const isGoogle = eventInfo.event.extendedProps?.source === 'google'
    const isTask = eventInfo.event.extendedProps?.source === 'flexible_task'
    const isFromAI = eventInfo.event.extendedProps?.isFromAI

    // Determinar colores según el tipo de evento
    const getEventColors = () => {
      if (isGoogle) {
        return {
          bg: '#d1fae5',
          border: '#10b981',
          text: '#065f46'
        }
      }
      if (isTask) {
        if (isFromAI) {
          return {
            bg: '#5f5ef1',
            border: '#4a4ad8',
            text: '#ffffff'
          }
        }
        return {
          bg: '#FEF3C7',
          border: '#F59E0B',
          text: '#92400E'
        }
      }
      // Eventos programados (TaskIA)
      return {
        bg: '#EEF2FF',
        border: '#6366F1',
        text: '#3730A3'
      }
    }

    const colors = getEventColors()

    return (
      <div
        className="flex flex-col h-full w-full px-2 py-1 overflow-hidden rounded-[6px] cursor-pointer"
        style={{
          backgroundColor: colors.bg,
          borderLeft: `3px solid ${colors.border}`,
        }}
      >
        <p
          className="text-[11px] font-semibold leading-tight truncate"
          style={{ color: colors.text }}
        >
          {/* Icono para distinguir origen */}
          {isGoogle && <span className="mr-1">📅</span>}
          {isTask && isFromAI && <span className="mr-1">🤖</span>}
          {isTask && !isFromAI && <span className="mr-1">📝</span>}
          {!isGoogle && !isTask && <span className="mr-1">📋</span>}
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
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          locales={[esLocale]}
          locale="es"
          events={allEvents}
          eventContent={renderEventContent}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          editable={true}
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
          eventOverlap={false} // Evitar que eventos se solapen completamente
        />
      </div>

      {/* Modal de detalles de tarea */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          showCompleteButton={false} // En el calendario no mostramos el botón de completar
        />
      )}
    </>
  )
}