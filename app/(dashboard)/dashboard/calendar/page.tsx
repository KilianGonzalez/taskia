import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScheduledBlocks, getGoogleCalendarEventsInRange, getFlexibleTasks } from "@/app/actions";
import { CalendarAiShell } from "@/components/calendar/CalendarAiShell";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [scheduledBlocks, googleCalendarResult, flexibleTasks] = await Promise.all([
    getScheduledBlocks(),
    getGoogleCalendarEventsInRange(),
    getFlexibleTasks(),
  ]);

  const allEvents = [...scheduledBlocks, ...googleCalendarResult.events];

  return (
    <CalendarAiShell
      initialEvents={allEvents}
      flexibleTasks={flexibleTasks}
    />
  );
}
