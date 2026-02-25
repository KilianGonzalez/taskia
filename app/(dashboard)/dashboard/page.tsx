import { getFlexibleTasks, getScheduledBlocks } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import CalendarView from "@/components/calendar/CalendarView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error("No user");

  const flexibleTasks = await getFlexibleTasks();
  const scheduledBlocks = await getScheduledBlocks();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(236,49%,22%)]">Mi Agenda</h1>
      </div>
      <div className="flex-1 bg-white rounded-xl shadow-sm border overflow-hidden">
        <CalendarView 
          initialEvents={scheduledBlocks} 
          flexibleTasks={flexibleTasks}
        />
      </div>
    </div>
  );
}
