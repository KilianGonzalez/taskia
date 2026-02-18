import { getFlexibleTasks, getScheduledBlocks } from "@/app/actions";
import { createClient } from "@/lib/supabase/server"; // AHORA SÍ: createClient
import CalendarView from "@/components/calendar/CalendarView";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  // 1. Verificar sesión
  const supabase = await createClient(); // Usamos createClient()
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Obtener datos (Si falla la DB, devolverá arrays vacíos gracias al paso 2)
  const flexibleTasks = await getFlexibleTasks();
  const scheduledBlocks = await getScheduledBlocks();

  // 3. Renderizar
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[hsl(236,49%,22%)]">
          Mi Agenda
        </h1>
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