import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFlexibleTasks } from "@/app/actions";
import {
  Plus,
  Search,
  Filter,
  Clock,
  BookOpen,
  CheckCircle2,
  Circle,
} from "lucide-react";

// Agrupar tareas por fecha
function groupTasksByDate(tasks: any[]) {
  const groups: Record<string, any[]> = {}

  tasks.forEach((task) => {
    const date = task.due_date
      ? new Date(task.due_date).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        })
      : 'Sin fecha'

    if (!groups[date]) groups[date] = []
    groups[date].push(task)
  })

  return groups
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-red-500',    bg: 'bg-red-50' },
  media: { label: 'Media', color: 'text-yellow-600',  bg: 'bg-yellow-50' },
  baja:  { label: 'Baja',  color: 'text-green-600',   bg: 'bg-green-50' },
}

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tasks = await getFlexibleTasks()

  const pending   = tasks.filter((t: any) => !t.completed)
  const completed = tasks.filter((t: any) => t.completed)
  const grouped   = groupTasksByDate(pending)

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Mis Tareas</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pending.length} pendientes · {completed.length} completadas esta semana
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(90deg, #1e2d5e, #2d4a8a)' }}
        >
          <Plus className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>

      {/* Buscador + Filtros */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tareas o materias..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 shadow-sm hover:bg-gray-50 transition-all">
          <Filter className="w-4 h-4" />
          Todas las prioridades
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
        {[
          { label: 'Todas',      count: tasks.length },
          { label: 'Pendientes', count: pending.length },
          { label: 'Completadas', count: completed.length },
        ].map((tab, i) => (
          <button
            key={tab.label}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              i === 0
                ? 'bg-[#1e2d5e] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              i === 0 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista de tareas agrupadas por fecha */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">¡No tienes tareas pendientes!</p>
          <p className="text-sm mt-1">Crea una nueva tarea para empezar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dateTasks]) => {
            const completedInGroup = dateTasks.filter((t) => t.completed).length
            return (
              <div key={date} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

                {/* Cabecera del grupo */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-sm font-semibold text-[#0f172a] capitalize">
                      {date}
                    </span>
                    <span className="text-xs text-gray-400">
                      {completedInGroup}/{dateTasks.length} completadas
                    </span>
                  </div>
                </div>

                {/* Tareas del grupo */}
                <div className="divide-y divide-gray-50">
                  {dateTasks.map((task: any) => {
                    const priority = priorityConfig[task.priority] || priorityConfig.baja
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                      >
                        {/* Checkbox */}
                        <button className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors">
                          {task.completed
                            ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                            : <Circle className="w-5 h-5" />
                          }
                        </button>

                        {/* Punto de color (materia) */}
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />

                        {/* Contenido */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {task.subject && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <BookOpen className="w-3 h-3" />
                                {task.subject}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400">
                                <Clock className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Prioridad */}
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${priority.bg} ${priority.color}`}>
                          {priority.label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Botón añadir tarea */}
                <div className="px-5 py-2.5 border-t border-dashed border-gray-100">
                  <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-indigo-500 transition-colors w-full justify-center py-1">
                    <Plus className="w-3.5 h-3.5" />
                    Añadir tarea
                  </button>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}