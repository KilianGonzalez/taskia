import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getScheduledBlocks, getGoogleCalendarEvents } from "@/app/actions";
import { CalendarAiShell } from "@/components/calendar/CalendarAiShell";

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [scheduledBlocks, googleEvents] = await Promise.all([
    getScheduledBlocks(),
    getGoogleCalendarEvents(),
  ]);

  const allEvents = [...scheduledBlocks, ...googleEvents];

  return (
    <CalendarAiShell
      initialEvents={allEvents}
      flexibleTasks={[]}
    />
  );
}