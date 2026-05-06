'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  MoreHorizontal,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'

const STORAGE_KEY = 'taskia_onboarding_step2'

const steps = [
  { label: 'Tu semana', sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos', sub: 'Examenes y entregas', icon: Target },
]

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

type CommitmentType = 'clase' | 'actividad' | 'otro'

type Compromiso = {
  id: string
  titulo: string
  tipo: CommitmentType
  dias: number[]
  inicio: string
  fin: string
}

function getStoredCompromisos(): Compromiso[] {
  if (typeof window === 'undefined') return []

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const saved = JSON.parse(raw) as { compromisos?: Compromiso[] }
    return Array.isArray(saved.compromisos) ? saved.compromisos : []
  } catch {
    return []
  }
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = i === current
        const isCompleted = i < current

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex w-32 flex-col items-center">
              <div
                className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive || isCompleted ? 'brand-gradient text-white shadow-md' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <p className={`text-center text-xs font-semibold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </p>
              <p className="mt-0.5 text-center text-[10px] text-muted-foreground">{step.sub}</p>
            </div>

            {i < steps.length - 1 && (
              <div className={`mb-7 h-0.5 w-24 ${i < current ? 'bg-primary/70' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AddCompromisoForm({ onCancel, onAdd }: { onCancel: () => void; onAdd: (value: Compromiso) => void }) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<CommitmentType>('clase')
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4])
  const [inicio, setInicio] = useState('08:00')
  const [fin, setFin] = useState('09:00')

  const inputClass =
    'w-full rounded-xl border border-input bg-background/85 px-3 py-2 text-sm text-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30 placeholder:text-muted-foreground'

  const toggleDay = (index: number) => {
    setDias((prev) =>
      prev.includes(index) ? prev.filter((d) => d !== index) : [...prev, index].sort((a, b) => a - b)
    )
  }

  const handleAdd = () => {
    if (!titulo.trim() || !inicio || !fin) return

    onAdd({
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      tipo,
      dias,
      inicio,
      fin,
    })
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card/60 p-4">
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Titulo</p>
        <input type="text" placeholder="Ej. Clase de matematicas" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} autoFocus />
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tipo</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: 'clase' as const, label: 'Clase', Icon: BookOpen },
            { key: 'actividad' as const, label: 'Actividad', Icon: Activity },
            { key: 'otro' as const, label: 'Otro', Icon: MoreHorizontal },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTipo(key)}
              className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-sm font-medium transition-all duration-300 ${
                tipo === key
                  ? 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                  : 'border-border bg-background/80 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Dias</p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const selected = dias.includes(i)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={`rounded-xl py-2 text-xs font-semibold transition-all duration-300 ${
                  selected ? 'brand-gradient text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/75'
                }`}
              >
                {day[0]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inicio</p>
          <input type="time" value={inicio} onChange={(e) => setInicio(e.target.value)} className={inputClass} />
        </div>

        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fin</p>
          <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="rounded-xl border border-input py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted/60">
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!titulo.trim()}
          className="brand-gradient rounded-xl py-2 text-sm font-semibold text-white transition-all duration-300 hover:brightness-110 disabled:opacity-40"
        >
          Anadir
        </button>
      </div>
    </div>
  )
}

export default function OnboardingStep2() {
  const router = useRouter()
  const [compromisos, setCompromisos] = useState<Compromiso[]>(getStoredCompromisos)
  const [showForm, setShowForm] = useState(false)

  const persistStep = (nextCompromisos: Compromiso[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ compromisos: nextCompromisos }))
  }

  const handleDelete = (id: string) => {
    const next = compromisos.filter((c) => c.id !== id)
    setCompromisos(next)
    persistStep(next)
  }

  const handleContinue = () => {
    persistStep(compromisos)
    router.push('/onboarding/step3')
  }

  return (
    <div className="min-h-screen section-enter bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 px-6 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="mb-6 flex items-center gap-3">
          <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl shadow-md">
            <span className="text-lg font-black text-white">T</span>
          </div>
          <span className="text-xl font-bold text-foreground">TaskIA</span>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">Vamos a configurar tu planificador en 3 pasos</p>

        <Stepper current={1} />

        <div className="surface-card-strong w-full max-w-xl space-y-4 p-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Compromisos fijos</h2>
            <p className="mt-1 text-sm text-muted-foreground">Anade clases, entrenamientos o actividades recurrentes.</p>
          </div>

          {compromisos.length > 0 && (
            <div className="space-y-2">
              {compromisos.map((c) => (
                <div key={c.id} className="group flex items-center justify-between rounded-2xl border border-teal-200/70 bg-teal-50/70 px-4 py-2.5 dark:border-teal-900 dark:bg-teal-950/35">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300">
                      {c.tipo === 'clase' ? (
                        <BookOpen className="h-3.5 w-3.5" />
                      ) : c.tipo === 'actividad' ? (
                        <Activity className="h-3.5 w-3.5" />
                      ) : (
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.inicio} - {c.fin}
                        {c.dias.length > 0 && ` · ${c.dias.length} ${c.dias.length === 1 ? 'dia' : 'dias'}/semana`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    className="text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <AddCompromisoForm
              onCancel={() => setShowForm(false)}
              onAdd={(value) => {
                const next = [...compromisos, value]
                setCompromisos(next)
                persistStep(next)
                setShowForm(false)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-input px-4 py-2.5 text-sm font-medium text-primary transition-all duration-300 hover:bg-muted/60"
            >
              <Plus className="h-4 w-4" />
              Anadir compromiso
            </button>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={handleContinue} className="rounded-2xl border border-input px-5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted/60">
              Saltar por ahora
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="brand-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="my-6 text-xs text-muted-foreground">Paso 2 de 3</p>
      </div>
    </div>
  )
}
