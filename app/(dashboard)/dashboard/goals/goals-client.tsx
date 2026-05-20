"use client"

/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, TrendingUp, Flame, Trophy,
  BookOpen, Heart, Zap, Calendar,
  Target, X, AlertCircle, Loader2, Trash2, CheckCircle2,
} from "lucide-react"
import { createGoal, deleteGoal, updateGoalProgress } from "@/app/actions"

// ── Tipos ──────────────────────────────────────────────
export interface Goal {
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

const GOAL_TAB_FILTER: Record<'Todos' | 'Académico' | 'Personal' | 'Hábitos', Goal['category'] | null> = {
  'Todos': null,
  'Académico': 'academic',
  'Personal': 'personal',
  'Hábitos': 'habit',
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

function getTodayDateInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isGoalOverdue(goal: Goal) {
  if (!goal.due_date || goal.status === 'completed') {
    return false
  }

  const dueDateRaw = goal.due_date.trim()
  const dateOnlyMatch = dueDateRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    const dueDate = new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return dueDate < todayStart
  }

  const parsedDueDate = new Date(dueDateRaw)
  if (Number.isNaN(parsedDueDate.getTime())) {
    return false
  }

  return parsedDueDate.getTime() < Date.now()
}

// ── Modal Nuevo Objetivo ───────────────────────────────
function NewGoalModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const minDueDate = getTodayDateInputValue()
  const [form, setForm] = useState({
    title: '', description: '', category: 'academic',
    target_value: '100', unit: '%', due_date: '', priority: 'medium' as 'low' | 'medium' | 'high',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    if (!form.target_value || Number(form.target_value) <= 0) { setError('El valor objetivo debe ser mayor que 0'); return }
    if (form.due_date && form.due_date < minDueDate) { setError('La fecha límite no puede ser anterior a hoy'); return }
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
      <div className="app-modal relative w-full max-w-md space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Nuevo objetivo</h2>
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
              min={minDueDate}
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
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-60 bg-gradient-to-r from-emerald-500 to-emerald-700">
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
  const [value, setValue] = useState(goal.current_value)
  const [error, setError] = useState('')
  const config = categoryConfig[goal.category] || categoryConfig.academic

  const clamped = Math.min(goal.target_value, Math.max(0, value))
  const currentProgress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
  const newProgress = Math.min(100, Math.round((clamped / goal.target_value) * 100))
  const hasChanged = clamped !== goal.current_value

  const presets = [
    { label: '25%', val: Math.round(goal.target_value * 0.25) },
    { label: '50%', val: Math.round(goal.target_value * 0.5) },
    { label: '75%', val: Math.round(goal.target_value * 0.75) },
    { label: '100%', val: goal.target_value },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isNaN(clamped) || clamped < 0) { setError('Introduce un valor válido'); return }
    setLoading(true)
    const res = await updateGoalProgress(goal.id, clamped)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    onUpdated(clamped)
    onClose()
  }

  const CategoryIcon = config.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">

        {/* Header con color de categoría */}
        <div className={`relative overflow-hidden px-6 py-5 ${config.bg}`}>
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20" />
          <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-full bg-white/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/30">
                <CategoryIcon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{config.label}</p>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">{goal.title}</h2>
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Barra de progreso actual */}
          <div className="relative mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Progreso actual: <span className="font-semibold text-gray-700 dark:text-gray-200">{goal.current_value} {goal.unit}</span>
              </span>
              <span className={`text-xs font-bold ${config.color}`}>{currentProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/40">
              <div
                className={`h-full rounded-full transition-all duration-500 ${config.progressColor}`}
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">

          {/* Preview del nuevo valor */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Nuevo progreso</span>
              <div className="flex items-center gap-1.5">
                {newProgress === 100 && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                )}
                <span className={`text-lg font-bold ${config.color}`}>{newProgress}%</span>
              </div>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              {/* Barra anterior (ghost) */}
              <div
                className="absolute h-full rounded-full bg-gray-300 dark:bg-gray-600 transition-all duration-300"
                style={{ width: `${currentProgress}%` }}
              />
              {/* Barra nueva */}
              <div
                className={`absolute h-full rounded-full transition-all duration-300 ${config.progressColor}`}
                style={{ width: `${newProgress}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
              {clamped} / {goal.target_value} {goal.unit}
            </p>
          </div>

          {/* Slider */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Arrastra para ajustar
            </label>
            <input
              type="range"
              min={0}
              max={goal.target_value}
              step={goal.target_value > 100 ? Math.ceil(goal.target_value / 100) : 1}
              value={clamped}
              onChange={(e) => setValue(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-current dark:bg-gray-700"
              style={{ accentColor: config.color.includes('indigo') ? '#4f46e5' : config.color.includes('violet') ? '#7c3aed' : '#10b981' }}
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>0</span>
              <span>{goal.target_value} {goal.unit}</span>
            </div>
          </div>

          {/* Presets rápidos */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Accesos rápidos</p>
            <div className="grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setValue(p.val)}
                  className={`rounded-xl py-2 text-xs font-semibold transition-all ${
                    clamped === p.val
                      ? `${config.bg} ${config.color} ring-2 ring-current/30`
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input numérico exacto */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Valor exacto ({goal.unit})
            </label>
            <input
              type="number"
              min={0}
              max={goal.target_value}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition-all focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-950">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanged}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 ${config.progressColor}`}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Guardando...' : hasChanged ? 'Guardar progreso' : 'Sin cambios'}
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
  const expiredGoals = activeGoals.filter((goal) => isGoalOverdue(goal))
  const nonExpiredActiveGoals = activeGoals.filter((goal) => !isGoalOverdue(goal))

  const filtered = useMemo(() => {
    if (activeTab === 'Todos') return nonExpiredActiveGoals
    return nonExpiredActiveGoals.filter(g => g.category === tabFilter[activeTab])
  }, [nonExpiredActiveGoals, activeTab, tabFilter])

  const filteredExpired = useMemo(() => {
    if (activeTab === 'Todos') return expiredGoals
    return expiredGoals.filter(g => g.category === tabFilter[activeTab])
  }, [expiredGoals, activeTab, tabFilter])

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
    <div className="space-y-6">

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
          <h1 className="text-2xl font-bold text-foreground">Mis objetivos</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {activeGoals.length} activos · {completedGoals.length} completados
          </p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:brightness-110">
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
            <div key={metric.label} className="app-card flex items-center gap-4 p-4">
              <div className={`w-10 h-10 rounded-xl ${metric.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${metric.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{metric.value}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{metric.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Tabs */}
      <div className="app-card flex w-fit items-center gap-1 p-1">
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
                className="app-card group p-5 transition-all hover:shadow-md">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{goal.title}</h3>
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
      {filteredExpired.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
              Caducadas
            </h2>
          </div>

          {filteredExpired.map((goal) => {
            const config = categoryConfig[goal.category] || categoryConfig.academic
            const CategoryIcon = config.icon
            const progress = Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))

            return (
              <div key={`expired-${goal.id}`}
                className="rounded-2xl border border-red-200/60 bg-card p-5 shadow-sm dark:border-red-900">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-foreground">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                    </div>

                    <div className="w-full mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {goal.current_value} / {goal.target_value} {goal.unit}
                        </span>
                        <span className={`text-xs font-bold ${config.color}`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all duration-500 ${config.progressColor}`}
                          style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3">
                      {goal.due_date && (
                        <span className="flex items-center gap-1 text-[11px] text-red-500 dark:text-red-400 font-medium">
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






