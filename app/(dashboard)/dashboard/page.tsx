import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getUserProfile, getUserStats, getTodayTasks } from "@/app/actions"
import Link from "next/link"
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  ListTodo,
  Settings,
  Sparkles,
  Target,
} from "lucide-react"

type TodayTask = Awaited<ReturnType<typeof getTodayTasks>>[number]

function getGreeting() {
  const currentHour = new Date().getHours()
  if (currentHour < 12) return "Buenos dias"
  if (currentHour < 20) return "Buenas tardes"
  return "Buenas noches"
}

function formatToday() {
  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return today.charAt(0).toUpperCase() + today.slice(1)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const [profile, stats, todayTasks] = await Promise.all([
    getUserProfile(),
    getUserStats(),
    getTodayTasks(),
  ])

  const greeting = getGreeting()
  const todayFormatted = formatToday()

  const metricCards = [
    {
      value: stats.pendingToday,
      label: "Hoy pendientes",
      icon: ListTodo,
      tone: "text-primary",
      chip: "bg-primary/10 text-primary",
    },
    {
      value: stats.completedThisWeek,
      label: "Completadas",
      icon: CheckCircle2,
      tone: "text-emerald-500",
      chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    },
    {
      value: stats.activeGoals,
      label: "Objetivos activos",
      icon: Target,
      tone: "text-cyan-600 dark:text-cyan-300",
      chip: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    },
    {
      value: stats.streak,
      label: "Racha actual",
      icon: Flame,
      tone: "text-amber-500",
      chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    },
  ]

  const quickLinks = [
    {
      href: "/dashboard/tasks",
      icon: ListTodo,
      label: "Tareas",
      description: "Gestiona todas tus tareas pendientes",
      badge: stats.pendingToday > 0 ? `${stats.pendingToday} pendientes` : null,
      iconClass: "bg-primary text-primary-foreground",
      badgeClass: "bg-primary/12 text-primary",
    },
    {
      href: "/dashboard/goals",
      icon: Target,
      label: "Objetivos",
      description: "Seguimiento de metas academicas y personales",
      badge: stats.activeGoals > 0 ? `${stats.activeGoals} en progreso` : null,
      iconClass: "bg-emerald-500 text-white",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    },
    {
      href: "/dashboard/settings",
      icon: Settings,
      label: "Configuracion",
      description: "Personaliza tu experiencia en TaskIA",
      badge: "Ajustes",
      iconClass: "bg-cyan-600 text-white",
      badgeClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="app-header">
        <div className="section-enter">
          <p className="app-kicker">{todayFormatted}</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">
            {greeting}, {profile?.name ?? "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.pendingToday > 0
              ? `Tienes ${stats.pendingToday} tareas pendientes para hoy.`
              : "No tienes tareas pendientes para hoy."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 stagger-in">
        {metricCards.map((metric) => {
          const Icon = metric.icon

          return (
            <div key={metric.label} className="app-card p-4 interactive-lift">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${metric.chip}`}>
                  <Icon className={`h-5 w-5 ${metric.tone}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{metric.value}</p>
                  <p className="text-xs text-muted-foreground">{metric.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Acceso rapido
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 stagger-in">
          {quickLinks.map((item) => {
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href} className="app-card interactive-lift group p-5">
                <div className="flex items-start gap-4">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{item.label}</p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>

                    {item.badge ? (
                      <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${item.badgeClass}`}>
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <div className="app-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Tareas de hoy</h2>
            <Link href="/dashboard/tasks" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver todas <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">No hay tareas para hoy.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task: TodayTask) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5">
                  <div
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      String(task.priority) === "alta"
                        ? "bg-red-400"
                        : String(task.priority) === "media"
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        task.completed ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </p>

                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      {task.category ? <span>{task.category}</span> : null}
                      {task.due_date ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="brand-gradient float-soft rounded-2xl p-5 text-white shadow-lg">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-100">Sugerencia IA</span>
            </div>

            <p className="text-sm leading-relaxed text-white/90">
              {stats.pendingToday > 0
                ? `Tienes ${stats.pendingToday} tareas pendientes. Empieza por las de mayor prioridad para liberar el resto del dia.`
                : "Buen trabajo. Aprovecha para adelantar una tarea de manana o revisar objetivos de la semana."}
            </p>

            <Link href="/dashboard/tasks" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-100 hover:text-white">
              Ver plan de estudio <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <Link href="/dashboard/calendar" className="app-card interactive-lift group flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-700 dark:text-cyan-300">
              <Calendar className="h-5 w-5" />
            </div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Mi calendario</p>
              <p className="text-xs text-muted-foreground">Ver semana completa</p>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
          </Link>
        </div>
      </div>
    </div>
  )
}
