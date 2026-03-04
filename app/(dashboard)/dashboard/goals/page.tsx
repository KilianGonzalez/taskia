import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Plus,
  TrendingUp,
  Flame,
  Trophy,
  BookOpen,
  Heart,
  Zap,
  Calendar,
  Target,
} from "lucide-react";

// Tipos
interface Goal {
  id: string
  title: string
  description: string
  category: 'academic' | 'personal' | 'habit'
  current_value: number
  target_value: number
  unit: string
  due_date: string
  status: 'active' | 'completed' | 'paused'
  streak?: number
}

const categoryConfig = {
  academic: {
    label: 'Académico',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    icon: BookOpen,
    progressColor: 'bg-[#1e2d5e]',
  },
  personal: {
    label: 'Personal',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    icon: Heart,
    progressColor: 'bg-violet-500',
  },
  habit: {
    label: 'Hábitos',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: Zap,
    progressColor: 'bg-emerald-500',
  },
}

const tabs = ['Todos', 'Académico', 'Personal', 'Hábitos']

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Obtener objetivos reales de Supabase
  const { data: goalsData } = await supabase
  .from('goals')
  .select('*')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })

  const goals: Goal[] = goalsData || []

  const activeGoals    = goals.filter((g: Goal) => g.status === 'active')
  const completedGoals = goals.filter((g: Goal) => g.status === 'completed')

  // Calcular progreso medio
  const avgProgress = activeGoals.length > 0
    ? Math.round(
        activeGoals.reduce((acc: number, g: Goal) => {
          return acc + Math.min(100, Math.round((g.current_value / g.target_value) * 100))
        }, 0) / activeGoals.length
      )
    : 0

  // Racha más larga
  const maxStreak = goals.reduce((max: number, g: Goal) => Math.max(max, g.streak || 0), 0)

  return (
    <div className="min-h-full bg-[#f8fafc] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a]">Mis Objetivos</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeGoals.length} activos · {completedGoals.length} completados
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
        >
          <Plus className="w-4 h-4" />
          Nuevo objetivo
        </button>
      </div>

      {/* Métricas resumen */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            value: `${avgProgress}%`,
            label: 'Progreso medio',
            icon: TrendingUp,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            value: `${maxStreak} días`,
            label: 'Racha más larga',
            icon: Flame,
            color: 'text-orange-500',
            bg: 'bg-orange-50',
          },
          {
            value: completedGoals.length,
            label: 'Logros obtenidos',
            icon: Trophy,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
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

      {/* Tabs de categoría */}
      <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm">
        {tabs.map((tab, i) => {
          const icons = [Target, BookOpen, Heart, Zap]
          const Icon = icons[i]
          return (
            <button
              key={tab}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                i === 0
                  ? 'bg-[#1e2d5e] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab}
            </button>
          )
        })}
      </div>

      {/* Lista de objetivos */}
      {activeGoals.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tienes objetivos activos</p>
          <p className="text-sm mt-1">Crea un nuevo objetivo para empezar a hacer seguimiento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeGoals.map((goal: Goal) => {
            const config = categoryConfig[goal.category] || categoryConfig.academic
            const CategoryIcon = config.icon
            const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">

                  {/* Icono categoría */}
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Título y descripción */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#0f172a]">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{goal.description}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500">
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </span>
                        <span className={`text-xs font-bold ${config.color}`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${config.progressColor}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer: fecha + racha */}
                    <div className="flex items-center gap-4 mt-3">
                      {goal.due_date && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(goal.due_date).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {goal.streak && goal.streak > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-orange-500 font-semibold">
                          <Flame className="w-3 h-3" />
                          {goal.streak} días
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}