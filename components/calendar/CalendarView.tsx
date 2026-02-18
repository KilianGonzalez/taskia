'use client';

import { useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { EventInput } from '@fullcalendar/core';
import { getScheduledBlocks } from '@/app/actions';

export function CalendarView() {
  const handleEvents = useCallback(async (info: any, successCallback: (events: any[]) => void) => {
    try {
      const events = await getScheduledBlocks(
        info.startStr,
        info.endStr
      );
      
      const formattedEvents = events.map(event => ({
        id: event.id,
        title: event.title,
        start: event.start_datetime,
        end: event.end_datetime,
        backgroundColor: event.color || 'var(--primary)',
        borderColor: event.color || 'var(--primary)',
        extendedProps: {
          blockType: event.block_type
        }
      }));
      
      successCallback(formattedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      successCallback([]);
    }
  }, []);

  return (
    <div className="h-full w-full">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'title',
          center: '',
          right: 'prev,next today'
        }}
        locale={esLocale}
        firstDay={1} // Lunes como primer día de la semana
        allDaySlot={false}
        nowIndicator={true}
        height="auto"
        events={handleEvents}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }}
        slotMinTime="07:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        expandRows={true}
        stickyHeaderDates={true}
      />
    </div>
  );
}
