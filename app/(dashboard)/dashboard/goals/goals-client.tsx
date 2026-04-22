"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, TrendingUp, Flame, Trophy,
  BookOpen, Heart, Zap, Calendar,
  Target, X, AlertCircle, Loader2, Trash2,
} from "lucide-react"
import { createGoal, deleteGoal, updateGoalProgress } from "@/app/actions"

// ── Tipos ──────────────────────────────────────────────
interface Goal {
  id: string
  title: string
  description?: string
  category: 'academic' | 'personal' | 'habit'
  current_value: number
  target_value: number
  unit: string
  due_date?: string
  status: 'active' | 'completed' | 'paused'
  streak?: number
  created_at: string
  priority?: 'low' | 'medium' | 'high'
}

// ── Config visual ──────────────────────────────────────
const categoryConfig = {
  academic: {
    label: 'Académico', color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-950',
    border: 'border-indigo-100', icon: BookOpen, progressColor: 'bg-[#1e2d5e]',
  },
  personal: {
    label: 'Personal', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950',
    border: 'border-violet-100', icon: Heart, progressColor: 'bg-violet-500',
  },
  habit: {
    label: 'Hábitos', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950',
    border: 'border-emerald-100', icon: Zap, progressColor: 'bg-emerald-500',
  },
}

// ── Modal Nuevo Objetivo ───────────────────────────────
function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', description: '', category: 'academic',
    target_value: '100', unit: '%', due_date: '', priority: 'medium' as 'low' | 'medium' | 'high',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.target_value || Number(form.target_value) <= 0) { setError('El valor objetivo debe ser mayor que 0'); return }
    setLoading(true)
    const res = await createGoal({
      title: form.title.trim(),
      description: form.description || undefined,
      category: form.category,
      target_value: Number(form.target_value),
      unit: form.unit || '%',
      due_date: form.due_date || undefined,
      priority: form.priority,
    })
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onCreated()
    onClose()
  }

  const inputClass = "mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">Nuevo objetivo</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input type="text" placeholder="¿Qué quieres conseguir?" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className={inputClass} autoFocus />
          </div>

          <div>
            <label className={labelClass}>Descripción</label>
            <textarea placeholder="Describe tu objetivo..." rows={2} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className={`${inputClass} resize-none`} />
          </div>

          {/* Categoría */}
          <div>
            <label className={labelClass}>Categoría</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.entries(categoryConfig) as [string, typeof categoryConfig.academic][]).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={key} type="button"
                    onClick={() => setForm({ ...form, category: key })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      form.category === key
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}>
                    <Icon className="w-4 h-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Valor objetivo *</label>
              <input type="number" placeholder="Ej: 100" min="1" value={form.target_value}
                onChange={e => setForm({ ...form, target_value: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Unidad</label>
              <input type="text" placeholder="%, horas, km..." value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Fecha límite</label>
            <input type="date" value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className={inputClass} />
          </div>

          {/* Prioridad */}
          <div>
            <label className={labelClass}>Prioridad</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {[
                { key: 'low', label: 'Baja', color: 'bg-gray-50 text-gray-600 border-gray-200' },
                { key: 'medium', label: 'Media', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                { key: 'high', label: 'Alta', color: 'bg-red-50 text-red-600 border-red-200' }
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, priority: key as 'low' | 'medium' | 'high' })}
                  className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    form.priority === key
                      ? `${color} border-current`
                      : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Crear objetivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Actualizar Progreso ──────────────────────────
function UpdateProgressModal({ goal, onClose, onUpdated }: {
  goal: Goal; onClose: () => void; onUpdated: (newValue: number) => void
}) {
  const [loading, setLoading] = useState(false)
  const [value, setValue] = useState(String(goal.current_value))
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(value)
    if (isNaN(num) || num < 0) { setError('Introduce un valor válido'); return }
    setLoading(true)
    const res = await updateGoalProgress(goal.id, num)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onUpdated(num)
    onClose()
  }

  const progress = Math.min(100, Math.round((Number(value) / goal.target_value) * 100)) || 0
  const config = categoryConfig[goal.category] || categoryConfig.academic

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">Actualizar progreso</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{goal.title}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Objetivo: {goal.target_value} {goal.unit}</p>
        </div>

        {/* Preview progreso */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <span>{Number(value) || 0} / {goal.target_value} {goal.unit}</span>
            <span className={`font-bold ${config.color}`}>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all duration-300 ${config.progressColor}`}
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Valor actual ({goal.unit})
            </label>
            <input type="number" min="0" max={goal.target_value} value={value}
              onChange={e => setValue(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              autoFocus />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-60 ${config.progressColor}`}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Guardando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────
export function GoalsClient({ initialGoals }: { initialGoals: Goal[] }) {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [activeTab, setActiveTab] = useState<'Todos' | 'Académico' | 'Personal' | 'Hábitos'>('Todos')
  const [showNewModal, setShowNewModal] = useState(false)
  const [progressGoal, setProgressGoal] = useState<Goal | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setGoals(initialGoals)
  }, [initialGoals])

  const tabFilter: Record<string, string> = {
    'Académico': 'academic', 'Personal': 'personal', 'Hábitos': 'habit'
  }

  const activeGoals    = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  const filtered = useMemo(() => {
    if (activeTab === 'Todos') return activeGoals
    return activeGoals.filter(g => g.category === tabFilter[activeTab])
  }, [goals, activeTab])

  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((acc, g) => acc + Math.min(100, Math.round((g.current_value / g.target_value) * 100)), 0) / activeGoals.length)
    : 0
  const maxStreak = goals.reduce((max, g) => Math.max(max, g.streak || 0), 0)

  const handleDelete = async (goalId: string) => {
    setDeletingId(goalId)
    setGoals(prev => prev.filter(g => g.id !== goalId))
    const res = await deleteGoal(goalId)
    if (res.error) router.refresh()
    setDeletingId(null)
  }

  const handleProgressUpdated = (goalId: string, newValue: number) => {
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? { ...g, current_value: newValue, status: newValue >= g.target_value ? 'completed' : 'active' }
        : g
    ))
  }

  const tabs = ['Todos', 'Académico', 'Personal', 'Hábitos'] as const
  const tabIcons = [Target, BookOpen, Heart, Zap]

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-gray-950 p-6 space-y-6">

      {showNewModal && (
        <NewGoalModal onClose={() => setShowNewModal(false)} onCreated={() => router.refresh()} />
      )}
      {progressGoal && (
        <UpdateProgressModal goal={progressGoal} onClose={() => setProgressGoal(null)}
          onUpdated={(v) => { handleProgressUpdated(progressGoal.id, v); setProgressGoal(null) }} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">Mis Objetivos</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {activeGoals.length} activos · {completedGoals.length} completados
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}>
          <Plus className="w-4 h-4" />
          Nuevo objetivo
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: `${avgProgress}%`, label: 'Progreso medio',  icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
          { value: `${maxStreak} días`, label: 'Racha más larga', icon: Flame,      color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950' },
          { value: completedGoals.length, label: 'Logros obtenidos', icon: Trophy,  color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950' },
        ].map((metric) => {
          const Icon = metric.icon
          return (
            <div key={metric.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${metric.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-[#0f172a] dark:text-white">{metric.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{metric.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-1 w-fit shadow-sm">
        {tabs.map((tab, i) => {
          const Icon = tabIcons[i]
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-[#1e2d5e] text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab}
            </button>
          )
        })}
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tienes objetivos activos</p>
          <p className="text-sm mt-1">Crea un nuevo objetivo para empezar a hacer seguimiento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => {
            const config = categoryConfig[goal.category] || categoryConfig.academic
            const CategoryIcon = config.icon
            const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))

            return (
              <div key={goal.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 hover:shadow-md transition-all group">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[#0f172a] dark:text-white">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <button onClick={() => handleDelete(goal.id)} disabled={deletingId === goal.id}
                          className="text-gray-200 dark:text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                          {deletingId === goal.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <button onClick={() => setProgressGoal(goal)}
                      className="w-full mt-3 text-left group/progress">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </span>
                        <span className={`text-xs font-bold ${config.color} group-hover/progress:underline`}>
                          {progress}% · Actualizar
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${config.progressColor}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </button>

                    {/* Footer */}
                    <div className="flex items-center gap-4 mt-3">
                      {goal.due_date && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(goal.due_date).toLocaleDateString('es-ES', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                      )}
                      {goal.streak && goal.streak > 0 ? (
                        <span className="flex items-center gap-1 text-[11px] text-orange-500 font-semibold">
                          <Flame className="w-3 h-3" />{goal.streak} días
                        </span>
                      ) : null}
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
