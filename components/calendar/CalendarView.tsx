'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

interface CalendarProps {
  initialEvents: any[]
  flexibleTasks: any[]
}

// Paleta de colores por categoría (puedes ampliarla)
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  default:    { bg: '#EEF2FF', border: '#6366F1', text: '#3730A3' },
  deporte:    { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  estudio:    { bg: '#FFF7ED', border: '#F97316', text: '#C2410C' },
  musica:     { bg: '#FDF4FF', border: '#D946EF', text: '#A21CAF' },
  ocio:       { bg: '#F0F9FF', border: '#0EA5E9', text: '#0369A1' },
}

export default function CalendarView({ initialEvents, flexibleTasks }: CalendarProps) {

  const renderEventContent = (eventInfo: any) => {
  const isGoogle = eventInfo.event.extendedProps?.source === 'google'

  return (
    <div
      className="flex flex-col h-full w-full px-2 py-1 overflow-hidden rounded-[6px] cursor-pointer"
      style={{
        backgroundColor: isGoogle ? '#d1fae5' : '#EEF2FF',
        borderLeft: `3px solid ${isGoogle ? '#10b981' : '#6366F1'}`,
      }}
    >
      <p
        className="text-[11px] font-semibold leading-tight truncate"
        style={{ color: isGoogle ? '#065f46' : '#3730A3' }}
      >
        {/* Icono para distinguir origen */}
        {isGoogle && <span className="mr-1">📅</span>}
        {eventInfo.event.title}
      </p>
      <p
        className="text-[10px] leading-tight mt-0.5 opacity-70"
        style={{ color: isGoogle ? '#065f46' : '#3730A3' }}
      >
        {eventInfo.timeText}
      </p>
    </div>
  )
}


  return (
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
        events={initialEvents}
        eventContent={renderEventContent}
        editable={true}
        selectable={true}
        height="100%"
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        allDaySlot={false}
        nowIndicator={true}
        expandRows={true}
        stickyHeaderDates={true}
        slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        eventMinHeight={28}
      />
    </div>
  )
}