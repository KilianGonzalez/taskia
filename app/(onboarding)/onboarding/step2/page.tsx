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
  BookOpen,
  Activity,
  MoreHorizontal,
} from 'lucide-react'

const STORAGE_KEY = 'taskia_onboarding_step2'

const steps = [
  { label: 'Tu semana', sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos', sub: 'Exámenes y entregas', icon: Target },
]

const DAYS = ['Lun', 'Mar', 'Mi', 'Jue', 'Vie', 'Sáb', 'Dom']

type CommitmentType = 'clase' | 'actividad' | 'otro'

type Compromiso = {
  id: string
  titulo: string
  tipo: CommitmentType
  dias: number[]
  inicio: string
  fin: string
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

function AddCompromisoForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void
  onAdd: (value: Compromiso) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState<CommitmentType>('clase')
  const [dias, setDias] = useState<number[]>([0, 1, 2, 3, 4])
  const [inicio, setInicio] = useState('08:00')
  const [fin, setFin] = useState('09:00')

  const inputClass =
    'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all placeholder-gray-300'

  const toggleDay = (index: number) => {
    setDias((prev) =>
      prev.includes(index)
        ? prev.filter((d) => d !== index)
        : [...prev, index].sort((a, b) => a - b)
    )
  }

  const handleAdd = () => {
    if (!titulo.trim()) return
    if (!inicio || !fin) return

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
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Título
        </p>
        <input
          type="text"
          placeholder="Ej. Clase de matemáticas"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className={inputClass}
          autoFocus
        />
      </div>

      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Tipo
        </p>
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
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
          Días
        </p>
        <div className="grid grid-cols-7 gap-2">
          {DAYS.map((day, i) => {
            const selected = dias.includes(i)

            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(i)}
                className={`py-2 rounded-xl text-xs font-semibold transition-all ${
                  selected
                    ? 'bg-gradient-to-b from-teal-400 to-teal-600 text-white shadow-md shadow-teal-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
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
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Inicio
          </p>
          <input
            type="time"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Fin
          </p>
          <input
            type="time"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
            className={inputClass}
          />
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

export default function OnboardingStep2() {
  const router = useRouter()
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw)
      setCompromisos(saved.compromisos ?? [])
    } catch {}
  }, [])

  const persistStep = (nextCompromisos: Compromiso[]) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        compromisos: nextCompromisos,
      })
    )
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

  const handleSkip = () => {
    persistStep(compromisos)
    router.push('/onboarding/step3')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 flex flex-col items-center justify-start py-10 px-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
          <span className="text-white font-black text-lg">T</span>
        </div>
        <span className="text-xl font-bold text-gray-800">TaskIA</span>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Vamos a configurar tu planificador en 3 pasos
      </p>

      <Stepper current={1} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-lg p-6 space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Compromisos fijos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Añade clases, entrenamientos o cualquier actividad recurrente
          </p>
        </div>

        {compromisos.length > 0 && (
          <div className="space-y-2">
            {compromisos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between px-4 py-2.5 bg-teal-50 border border-teal-100 rounded-2xl group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    {c.tipo === 'clase' ? (
                      <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    ) : c.tipo === 'actividad' ? (
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <MoreHorizontal className="w-3.5 h-3.5 text-teal-600" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.titulo}</p>
                    <p className="text-xs text-gray-400">
                      {c.inicio} - {c.fin}
                      {c.dias.length > 0 &&
                        ` · ${c.dias.length} ${
                          c.dias.length === 1 ? 'día' : 'días'
                        }/semana`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-200 rounded-2xl text-sm font-medium text-teal-500 hover:bg-teal-50 hover:border-teal-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            Añadir compromiso
          </button>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
          >
            Saltar por ahora
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-200"
            style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 my-6">Paso 2 de 3</p>
    </div>
  )
}