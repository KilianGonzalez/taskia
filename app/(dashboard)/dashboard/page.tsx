import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserProfile, getUserStats, getTodayTasks } from "@/app/actions";
import Link from "next/link";
import {
  ListTodo,
  Target,
  Settings,
  Flame,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Calendar,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile, stats, todayTasks] = await Promise.all([
    getUserProfile(),
    getUserStats(),
    getTodayTasks(),
  ])

  const currentHour = new Date().getHours()
  const greeting =
    currentHour < 12 ? 'Buenos días' :
    currentHour < 20 ? 'Buenas tardes' :
    'Buenas noches'

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  // Capitalizar primera letra
  const todayFormatted = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">

      {/* ── SALUDO ── */}
      <div>
        <p className="text-sm text-gray-400 font-medium">{todayFormatted}</p>
        <h1 className="text-2xl font-bold text-[#0f172a] mt-0.5">
          {greeting}, {profile?.name}! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {stats.pendingToday > 0
            ? <>Tienes <span className="font-semibold text-gray-700">{stats.pendingToday} tareas</span> pendientes para hoy.</>
            : '¡No tienes tareas pendientes para hoy! 🎉'
          }
        </p>
      </div>

      {/* ── MÉTRICAS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            value: stats.pendingToday,
            label: 'Hoy pendientes',
            icon: ListTodo,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
          },
          {
            value: stats.completedThisWeek,
            label: 'Completadas',
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            value: stats.activeGoals,
            label: 'Objetivos activos',
            icon: Target,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            value: stats.streak,
            label: 'Racha actual',
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
          },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl ${metric.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#0f172a]">{metric.value}</p>
                <p className="text-xs text-gray-400">{metric.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── ACCESO RÁPIDO ── */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Acceso rápido
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              href: '/dashboard/tasks',
              icon: ListTodo,
              label: 'Tareas',
              description: 'Gestiona todas tus tareas pendientes',
              badge: stats.pendingToday > 0 ? `${stats.pendingToday} pendientes` : null,
              badgeColor: 'bg-indigo-50 text-indigo-600',
              iconBg: 'bg-[#1e2d5e]',
            },
            {
              href: '/dashboard/goals',
              icon: Target,
              label: 'Objetivos',
              description: 'Seguimiento de tus metas académicas y personales',
              badge: stats.activeGoals > 0 ? `${stats.activeGoals} en progreso` : null,
              badgeColor: 'bg-emerald-50 text-emerald-600',
              iconBg: 'bg-emerald-500',
            },
            {
              href: '/dashboard/settings',
              icon: Settings,
              label: 'Configuración',
              description: 'Personaliza tu experiencia en TaskIA',
              badge: 'Ajustes',
              badgeColor: 'bg-violet-50 text-violet-600',
              iconBg: 'bg-violet-500',
            },
          ].map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[#0f172a]">{item.label}</p>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{item.description}</p>
                  {item.badge && (
                    <span className={`inline-block mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── FILA INFERIOR: Tareas de hoy + Sugerencia IA ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">

        {/* Tareas de hoy */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#0f172a]">Tareas de hoy</h2>
            <Link
              href="/dashboard/tasks"
              className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">¡No hay tareas para hoy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.slice(0, 5).map((task: any) => (
                <div key={task.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    task.priority === 'alta' ? 'bg-red-400' :
                    task.priority === 'media' ? 'bg-yellow-400' :
                    'bg-green-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {task.subject && (
                        <span className="text-[10px] text-gray-400">{task.subject}</span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                          <Clock className="w-2.5 h-2.5" />
                          {new Date(task.due_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                  {task.priority && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      task.priority === 'alta' ? 'bg-red-50 text-red-500' :
                      task.priority === 'media' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-green-50 text-green-600'
                    }`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sugerencia IA */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl p-5 text-white flex-1"
            style={{ background: 'linear-gradient(135deg, #1e2d5e 0%, #2d4a8a 100%)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Sugerencia IA
              </span>
            </div>
            <p className="text-sm leading-relaxed text-blue-100">
              {stats.pendingToday > 0
                ? `Tienes ${stats.pendingToday} tareas pendientes. Te recomiendo empezar por las de mayor prioridad para tener la tarde libre.`
                : '¡Buen trabajo! No tienes tareas pendientes para hoy. Aprovecha para adelantar trabajo de mañana.'
              }
            </p>
            <Link
              href="/dashboard/tasks"
              className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Ver plan de estudio <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Acceso rápido al calendario */}
          <Link
            href="/dashboard/calendar"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-sky-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0f172a]">Mi Calendario</p>
              <p className="text-xs text-gray-400">Ver semana completa</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  )
}