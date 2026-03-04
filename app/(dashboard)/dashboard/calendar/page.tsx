import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScheduledBlocks, getGoogleCalendarEvents } from "@/app/actions";
import CalendarView from "@/components/calendar/CalendarView";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [scheduledBlocks, googleEvents] = await Promise.all([
    getScheduledBlocks(),
    getGoogleCalendarEvents(),
  ])

  const allEvents = [...scheduledBlocks, ...googleEvents]

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Mi Calendario</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Visualiza y gestiona tus eventos de la semana
          </p>
        </div>
        {/* Leyenda */}
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

      {/* Calendario */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <CalendarView
          initialEvents={allEvents}
          flexibleTasks={[]}
        />
      </div>

    </div>
  )
}