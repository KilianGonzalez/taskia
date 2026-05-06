export type CalendarEventSource = 'google' | 'flexible_task' | string

export type CalendarEventExtendedProps = {
  source?: CalendarEventSource
  category?: string
  priority?: string
  duration?: number
  taskId?: string
  isFromAI?: boolean
}

export type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  backgroundColor?: string
  borderColor?: string
  textColor?: string
  allDay?: boolean
  display?: string
  editable?: boolean
  durationEditable?: boolean
  startEditable?: boolean
  extendedProps?: CalendarEventExtendedProps
}

export type CalendarTask = {
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
