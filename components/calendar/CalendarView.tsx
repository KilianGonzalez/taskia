'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

// Definimos tipos básicos para evitar errores de TypeScript
interface CalendarProps {
  initialEvents: any[]
  flexibleTasks: any[]
}

export default function CalendarView({ initialEvents, flexibleTasks }: CalendarProps) {
  return (
    <div className="h-full w-full p-2">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={initialEvents} // Aquí pasamos los bloques de Supabase
        editable={true}
        selectable={true}
        height="100%"
        slotMinTime="06:00:00" // Empieza a las 6am para que se vea mejor
        slotMaxTime="24:00:00"
        allDaySlot={false}
        locale="es" // Si quieres español
      />
    </div>
  )
}