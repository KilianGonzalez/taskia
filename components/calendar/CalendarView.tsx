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
    const category = eventInfo.event.extendedProps?.category || 'default'
    const colors = categoryColors[category] || categoryColors.default

    return (
      <div
        className="flex flex-col h-full w-full px-2 py-1 overflow-hidden rounded-[6px] cursor-pointer group"
        style={{
          backgroundColor: colors.bg,
          borderLeft: `3px solid ${colors.border}`,
        }}
      >
        <p
          className="text-[11px] font-semibold leading-tight truncate"
          style={{ color: colors.text }}
        >
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