'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  Calendar,
  Target,
  ArrowRight,
  Plus,
  Trash2,
  Sparkles,
  GraduationCap,
  FileText,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STEP1_KEY = 'taskia_onboarding_step1'
const STEP2_KEY = 'taskia_onboarding_step2'
const STEP3_KEY = 'taskia_onboarding_step3'

const steps = [
  { label: 'Tu semana', sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos', sub: 'Exámenes y entregas', icon: Target },
]

type Objetivo = {
  id: string
  tipo: 'examen' | 'entrega'
  titulo: string
  materia: string
  fecha: string
  prioridad: 'Alta' | 'Media' | 'Baja'
}

type Compromiso = {
  id: string
  titulo: string
  tipo: 'clase' | 'actividad' | 'otro'
  dias: number[]
  inicio: string
  fin: string
}

type Step1Data = {
  timezone: string
  startTime: string
  endTime: string
  studyDays: number[]
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = i === current
        const isCompleted = i < current

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center w-32">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 transition-all ${
                  isActive || isCompleted
                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-md'
                    : 'bg-gray-100'
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? 'text-white' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>

              <p
                className={`text-xs font-semibold text-center ${
                  isActive
                    ? 'text-gray-800'
                    : isCompleted
                    ? 'text-teal-600'
                    : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>

              <p
                className={`text-[10px] text-center mt-0.5 ${
                  isActive ? 'text-gray-500' : 'text-gray-300'
                }`}
              >
                {step.sub}
              </p>
            </div>

            {i < steps.length - 1 && (
              <div
                className={`w-24 h-0.5 mb-7 ${
                  i < current ? 'bg-teal-400' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AddObjetivoForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void
  onAdd: (o: Objetivo) => void
}) {
  const [tipo, setTipo] = useState<'examen' | 'entrega'>('examen')
  const [titulo, setTitulo] = useState('')
  const [materia, setMateria] = useState('')
  const [fecha, setFecha] = useState('')
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>(
    'Media'
  )

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all placeholder-gray-300'

  const handleAdd = () => {
    if (!titulo.trim()) return

    onAdd({
      id: crypto.randomUUID(),
      tipo,
      titulo: titulo.trim(),
      materia: materia.trim() || 'General',
      fecha,
      prioridad,
    })
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Tipo
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'examen' as const, label: 'Examen', Icon: GraduationCap },
            { key: 'entrega' as const, label: 'Entrega', Icon: FileText },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTipo(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                tipo === key
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Título
        </p>
        <input
          type="text"
          placeholder="Ej. Examen de Historia"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Materia
        </p>
        <input
          type="text"
          placeholder="Ej. Historia"
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Fecha
          </p>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Prioridad
          </p>
          <select
            value={prioridad}
            onChange={(e) =>
              setPrioridad(e.target.value as 'Alta' | 'Media' | 'Baja')
            }
            className={inputClass}
          >
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!titulo.trim()}
          className="py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}

function getBlockColor(tipo: Compromiso['tipo']) {
  if (tipo === 'clase') return '#4f46e5'
  if (tipo === 'actividad') return '#10b981'
  return '#64748b'
}

function mapCommitmentTypeToBlockType(tipo: Compromiso['tipo']) {
  return 'fixed'
}

function getStartOfWeek(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function parseTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

function buildDate(base: Date, time: string) {
  const { hours, minutes } = parseTime(time)
  const d = new Date(base)
  d.setHours(hours, minutes, 0, 0)
  return d
}

function generateScheduledBlocks(commitments: Compromiso[], weeks = 6) {
  const now = new Date()
  const weekStart = getStartOfWeek(now)
  const rows: any[] = []

  for (const commitment of commitments) {
    for (let week = 0; week < weeks; week++) {
      for (const dayIndex of commitment.dias) {
        const dayBase = new Date(weekStart)
        dayBase.setDate(weekStart.getDate() + week * 7 + dayIndex)

        const start = buildDate(dayBase, commitment.inicio)
        const end = buildDate(dayBase, commitment.fin)

        if (end <= now) continue

        rows.push({
          title: commitment.titulo,
          block_type: mapCommitmentTypeToBlockType(commitment.tipo),
          start_datetime: start.toISOString(),
          end_datetime: end.toISOString(),
          color: getBlockColor(commitment.tipo),
          is_ai_generated: false,
          is_locked: true,
          metadata: {
            source: 'onboarding',
            recurring: true,
            ui_type: commitment.tipo,
            days: commitment.dias,
          },
        })
      }
    }
  }

  return rows
}

export default function OnboardingStep3() {
  const router = useRouter()
  const supabase = createClient()

  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STEP3_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw)
      setObjetivos(saved.objetivos ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STEP3_KEY,
      JSON.stringify({
        objetivos,
      })
    )
  }, [objetivos])

  const prioridadColor: Record<string, string> = {
    Alta: 'text-red-500 bg-red-50',
    Media: 'text-yellow-600 bg-yellow-50',
    Baja: 'text-green-600 bg-green-50',
  }

  const handleDelete = (id: string) => {
    setObjetivos((prev) => prev.filter((o) => o.id !== id))
  }

  const handleFinish = async () => {
    setSaving(true)

    try {
      const step1Raw = localStorage.getItem(STEP1_KEY)
      const step2Raw = localStorage.getItem(STEP2_KEY)

      const step1: Step1Data | null = step1Raw ? JSON.parse(step1Raw) : null
      const step2 = step2Raw ? JSON.parse(step2Raw) : { compromisos: [] }
      const compromisos: Compromiso[] = step2.compromisos ?? []

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle()

      const existingPreferences = existingProfile?.preferences ?? {}

      const profilePayload = {
        id: user.id,
        email: user.email ?? null,
        full_name:
          user.user_metadata?.full_name || user.user_metadata?.name || null,
        display_name:
          user.user_metadata?.full_name || user.user_metadata?.name || null,
        preferences: {
          ...existingPreferences,
          onboarding_week: step1
            ? {
                timezone: step1.timezone,
                start_time: step1.startTime,
                end_time: step1.endTime,
                study_days: step1.studyDays,
              }
            : existingPreferences.onboarding_week ?? null,
        },
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })

      if (profileError) {
        alert('No se pudo guardar el perfil: ' + profileError.message)
        setSaving(false)
        return
      }

      if (compromisos.length > 0) {
        const scheduledBlocks = generateScheduledBlocks(compromisos).map(
          (row) => ({
            ...row,
            user_id: user.id,
          })
        )

        if (scheduledBlocks.length > 0) {
          const { error: blocksError } = await supabase
            .from('scheduled_blocks')
            .insert(scheduledBlocks)

          if (blocksError) {
            alert(
              'No se pudieron guardar los compromisos: ' + blocksError.message
            )
            setSaving(false)
            return
          }
        }
      }

      if (objetivos.length > 0) {
        const goalsPayload = objetivos.map((o) => ({
          user_id: user.id,
          title: o.titulo,
          description: `${o.tipo === 'examen' ? 'Examen' : 'Entrega'} · ${
            o.materia
          } · Prioridad ${o.prioridad}`,
          category: 'academic',
          current_value: 0,
          target_value: 1,
          unit: o.tipo === 'examen' ? 'examen' : 'entrega',
          due_date: o.fecha ? new Date(`${o.fecha}T23:59:00`).toISOString() : null,
          status: 'active',
          streak: 0,
        }))

        const { error: goalsError } = await supabase
          .from('goals')
          .insert(goalsPayload)

        if (goalsError) {
          alert('No se pudieron guardar los objetivos: ' + goalsError.message)
          setSaving(false)
          return
        }
      }

      localStorage.removeItem(STEP1_KEY)
      localStorage.removeItem(STEP2_KEY)
      localStorage.removeItem(STEP3_KEY)

      router.refresh()
      router.push('/dashboard')
    } catch (error) {
      alert('Ha ocurrido un error al finalizar el onboarding.')
      setSaving(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-md">
          <span className="text-lg font-black text-white">T</span>
        </div>
        <span className="text-xl font-bold text-gray-800">TaskIA</span>
      </div>

      <p className="mb-6 text-sm text-gray-400">
        Vamos a configurar tu planificador en 3 pasos
      </p>

      <Stepper current={2} />

      <div className="w-full max-w-lg space-y-4 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Tus objetivos próximos
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Añade exámenes y entregas importantes para que TaskIA te ayude a
            planificar
          </p>
        </div>

        {objetivos.length > 0 && (
          <div className="space-y-2">
            {objetivos.map((o) => (
              <div
                key={o.id}
                className="group flex items-center justify-between rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100">
                    {o.tipo === 'examen' ? (
                      <GraduationCap className="h-3.5 w-3.5 text-teal-600" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-teal-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {o.titulo}
                    </p>
                    <p className="text-xs text-gray-400">
                      {o.materia}
                      {o.fecha &&
                        ` · ${new Date(o.fecha).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                        })}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prioridadColor[o.prioridad]}`}
                  >
                    {o.prioridad}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(o.id)}
                    className="text-gray-300 opacity-0 transition-colors group-hover:opacity-100 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <AddObjetivoForm
            onCancel={() => setShowForm(false)}
            onAdd={(o) => {
              setObjetivos((prev) => [...prev, o])
              setShowForm(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 px-4 py-2.5 text-sm font-medium text-teal-500 transition-all hover:border-teal-200 hover:bg-teal-50"
          >
            <Plus className="h-4 w-4" />
            Añadir objetivo
          </button>
        )}

        <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
          <div>
            <p className="text-sm font-semibold text-orange-700">
              La IA te ayudará
            </p>
            <p className="mt-0.5 text-xs text-orange-500">
              TaskIA usará estos objetivos para sugerirte sesiones de estudio y
              optimizar tu planificación automáticamente.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-500 transition-all hover:bg-gray-50 disabled:opacity-60"
          >
            Configurar después
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-200 transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              background: 'linear-gradient(90deg, #14b8a6, #0f766e)',
            }}
          >
            {saving ? 'Guardando...' : 'Empezar a usar TaskIA'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="my-6 text-xs text-gray-300">Paso 3 de 3</p>
    </div>
  )
}