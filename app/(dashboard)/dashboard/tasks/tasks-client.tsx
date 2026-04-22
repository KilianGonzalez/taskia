"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Plus, Search, Filter, Clock, Tag,
  CheckCircle2, Circle, Trash2, X,
  AlertCircle, Loader2
} from "lucide-react"
import { toggleTask, createTask, deleteTask } from "@/app/actions"
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal"

interface Task {
  id: string
  title: string
  category?: string
  priority?: string
  due_date?: string
  estimated_duration_min?: number
  difficulty?: number
  notes?: string
  completed: boolean
  completed_at?: string
  created_at: string
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-950' },
  media: { label: 'Media', color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  baja:  { label: 'Baja',  color: 'text-green-600',  bg: 'bg-green-50 dark:bg-green-950' },
}

function groupTasksByDate(tasks: Task[]) {
  const groups: Record<string, Task[]> = {}
  tasks.forEach((task) => {
    const date = task.due_date
      ? new Date(task.due_date).toLocaleDateString('es-ES', {
          weekday: 'long', day: 'numeric', month: 'short',
        })
      : 'Sin fecha'
    if (!groups[date]) groups[date] = []
    groups[date].push(task)
  })
  return groups
}

// ── Modal Nueva Tarea ──────────────────────────────────
function NewTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '', category: '', priority: 'media',
    due_date: '', estimated_duration: '', difficulty: '2', notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es obligatorio'); return }
    setLoading(true)
    const res = await createTask({
      title: form.title.trim(),
      category: form.category || undefined,
      priority: form.priority,
      due_date: form.due_date || undefined,
      estimated_duration_min: form.estimated_duration ? Number(form.estimated_duration) : undefined,
      difficulty: form.difficulty ? Number(form.difficulty) : undefined,
      notes: form.notes || undefined,
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
          <h2 className="text-lg font-bold text-[#0f172a] dark:text-white">Nueva tarea</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input type="text" placeholder="¿Qué tienes que hacer?" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className={inputClass} autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Categoría</label>
              <input type="text" placeholder="Ej: Estudio, Trabajo..." value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Prioridad</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                className={inputClass}>
                <option value="alta">Alta</option>
                <option value="media">Media</option>
                <option value="baja">Baja</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Fecha de entrega</label>
            <input type="date" value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
              className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Duración (min)</label>
              <input type="number" placeholder="Ej: 60" min="1" value={form.estimated_duration}
                onChange={e => setForm({ ...form, estimated_duration: e.target.value })}
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Dificultad (1-5)</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value })}
                className={inputClass}>
                {[1,2,3,4,5].map(n => (
                  <option key={n} value={n}>{n} — {['Muy fácil','Fácil','Normal','Difícil','Muy difícil'][n-1]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notas</label>
            <textarea placeholder="Detalles adicionales..." rows={2} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className={`${inputClass} resize-none`} />
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
              style={{ background: 'linear-gradient(90deg, #1e2d5e, #2d4a8a)' }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Crear tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────
export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('todas')
  const [activeTab, setActiveTab] = useState<'todas' | 'pendientes' | 'completadas'>('todas')
  const [showModal, setShowModal] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const [completingTask, setCompletingTask] = useState<Task | null>(null)

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.category?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchPriority = priorityFilter === 'todas' || t.priority === priorityFilter
      const matchTab =
        activeTab === 'todas' ? true :
        activeTab === 'pendientes' ? !t.completed :
        t.completed
      return matchSearch && matchPriority && matchTab
    })
  }, [tasks, search, priorityFilter, activeTab])

  const pending   = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)
  const grouped   = groupTasksByDate(filtered.filter(t => activeTab === 'completadas' ? t.completed : !t.completed))

  const handleToggle = async (taskId: string, current: boolean) => {
    // Si la tarea ya está completada, descompletar directamente
    if (current) {
      setTogglingId(taskId)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: false, completed_at: undefined } : t
      ))
      const res = await toggleTask(taskId, false)
      if (res.error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t))
      }
      setTogglingId(null)
    } else {
      // Si no está completada, abrir modal de confirmación
      const task = tasks.find(t => t.id === taskId)
      if (task) {
        setCompletingTask(task)
      }
    }
  }

  const handleCompleteTask = async () => {
    if (!completingTask) return
    
    setTogglingId(completingTask.id)
    const res = await toggleTask(completingTask.id, true)
    
    if (!res.error) {
      setTasks(prev => prev.map(t =>
        t.id === completingTask.id ? { ...t, completed: true, completed_at: new Date().toISOString() } : t
      ))
    }
    
    setTogglingId(null)
    setCompletingTask(null)
  }

  const handleDelete = async (taskId: string) => {
    setDeletingId(taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    const res = await deleteTask(taskId)
    if (res.error) router.refresh()
    setDeletingId(null)
  }

  const handleDeleteFromModal = async () => {
    if (!completingTask) return
    await handleDelete(completingTask.id)
    setCompletingTask(null)
  }

  const handleEditTask = () => {
    if (!completingTask) return
    // Por ahora, simplemente cerramos el modal
    // En el futuro, podríamos abrir un modal de edición
    setCompletingTask(null)
  }

  const priorityLabels: Record<string, string> = {
    todas: 'Todas las prioridades', alta: 'Alta', media: 'Media', baja: 'Baja',
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 p-6 space-y-6">

      {showModal && (
        <NewTaskModal onClose={() => setShowModal(false)} onCreated={() => router.refresh()} />
      )}

      {completingTask && (
        <TaskDetailModal 
          task={completingTask} 
          onClose={() => setCompletingTask(null)} 
          onComplete={handleCompleteTask} 
          onDelete={handleDeleteFromModal}
          onEdit={handleEditTask}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">Mis Tareas</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            {pending.length} pendientes · {completed.length} completadas
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(90deg, #1e2d5e, #2d4a8a)' }}>
          <Plus className="w-4 h-4" />
          Nueva tarea
        </button>
      </div>

      {/* Buscador + Filtros */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar tareas o categorías..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all shadow-sm" />
        </div>
        <div className="relative">
          <button onClick={() => setShowPriorityMenu(!showPriorityMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
            <Filter className="w-4 h-4" />
            {priorityLabels[priorityFilter]}
          </button>
          {showPriorityMenu && (
            <div className="absolute right-0 top-11 z-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 w-48">
              {Object.entries(priorityLabels).map(([key, label]) => (
                <button key={key}
                  onClick={() => { setPriorityFilter(key); setShowPriorityMenu(false) }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                    priorityFilter === key
                      ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl p-1 w-fit shadow-sm">
        {([
          { key: 'todas',       label: 'Todas',       count: tasks.length },
          { key: 'pendientes',  label: 'Pendientes',  count: pending.length },
          { key: 'completadas', label: 'Completadas', count: completed.length },
        ] as const).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-[#1e2d5e] text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}>
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key
                ? 'bg-white/20 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {search ? 'No hay tareas que coincidan con la búsqueda' : '¡No tienes tareas pendientes!'}
          </p>
          {!search && <p className="text-sm mt-1">Crea una nueva tarea para empezar</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, dateTasks]) => {
            const completedInGroup = dateTasks.filter(t => t.completed).length
            return (
              <div key={date} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">

                {/* Cabecera grupo */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="text-sm font-semibold text-[#0f172a] dark:text-white capitalize">{date}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{completedInGroup}/{dateTasks.length} completadas</span>
                  </div>
                </div>

                {/* Tareas */}
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {dateTasks.map((task) => {
                    const priority = priorityConfig[String(task.priority ?? '')] || priorityConfig.baja
                    const isToggling = togglingId === task.id
                    return (
                      <div 
                        key={task.id}
                        className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
                        onClick={() => {
                          if (!task.completed) {
                            setCompletingTask(task)
                          }
                        }}
                      >

                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggle(task.id, task.completed)
                          }} 
                          disabled={isToggling}
                          className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors disabled:opacity-50">
                          {isToggling
                            ? <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                            : task.completed
                              ? <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                              : <Circle className="w-5 h-5" />
                          }
                        </button>

                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${
                            task.completed
                              ? 'line-through text-gray-400 dark:text-gray-600'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {task.category && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                <Tag className="w-3 h-3" />{task.category}
                              </span>
                            )}
                            {task.due_date && (
                              <span className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
                                <Clock className="w-3 h-3" />
                                {new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            {task.estimated_duration_min && (
                              <span className="text-[11px] text-gray-400 dark:text-gray-500">
                                ~{task.estimated_duration_min} min
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${priority.bg} ${priority.color}`}>
                          {priority.label}
                        </span>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(task.id)
                          }} 
                          disabled={deletingId === task.id}
                          className="shrink-0 text-gray-200 dark:text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50">
                          {deletingId === task.id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <Trash2 className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Añadir tarea */}
                <div className="px-5 py-2.5 border-t border-dashed border-gray-100 dark:border-gray-800">
                  <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors w-full justify-center py-1">
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
