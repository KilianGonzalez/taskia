'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Calendar, Target, ArrowRight, Plus, Trash2, BookOpen, Activity, MoreHorizontal } from 'lucide-react'

// ── Stepper ────────────────────────────────────────────
const steps = [
  { label: 'Tu semana',         sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos',         sub: 'Exámenes y entregas',  icon: Target },
]

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive    = i === current
        const isCompleted = i < current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center w-32">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-1.5 transition-all ${
                isActive || isCompleted
                  ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-md'
                  : 'bg-gray-100'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                )}
              </div>
              <p className={`text-xs font-semibold text-center ${
                isActive ? 'text-gray-800' : isCompleted ? 'text-teal-600' : 'text-gray-400'
              }`}>{step.label}</p>
              <p className={`text-[10px] text-center mt-0.5 ${isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                {step.sub}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-24 h-0.5 mb-7 ${i < current ? 'bg-teal-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Tipos ──────────────────────────────────────────────
interface Compromiso {
  id: string
  titulo: string
  tipo: 'clase' | 'actividad' | 'otro'
  dias: number[]
  inicio: string
  fin: string
}

const DAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const TIPOS = [
  { key: 'clase',     label: 'Clase',     Icon: BookOpen },
  { key: 'actividad', label: 'Actividad', Icon: Activity },
  { key: 'otro',      label: 'Otro',      Icon: MoreHorizontal },
] as const

// ── Formulario inline ──────────────────────────────────
function AddCompromisoForm({ onCancel, onAdd }: {
  onCancel: () => void
  onAdd: (c: Compromiso) => void
}) {
  const [titulo, setTitulo] = useState('')
  const [tipo,   setTipo]   = useState<'clase' | 'actividad' | 'otro'>('clase')
  const [dias,   setDias]   = useState<number[]>([])
  const [inicio, setInicio] = useState('09:00')
  const [fin,    setFin]    = useState('10:00')

  const toggleDay = (i: number) =>
    setDias(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i])

  const handleAdd = () => {
    if (!titulo.trim()) return
    onAdd({ id: crypto.randomUUID(), titulo: titulo.trim(), tipo, dias, inicio, fin })
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all placeholder-gray-300"
  const labelClass = "text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1"

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">

      {/* Título */}
      <div>
        <label className={labelClass}>Título</label>
        <input type="text" placeholder="Ej: Clase de Física"
          value={titulo} onChange={e => setTitulo(e.target.value)}
          className={inputClass} autoFocus />
      </div>

      {/* Tipo */}
      <div>
        <label className={labelClass}>Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setTipo(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-xs font-medium transition-all ${
                tipo === key
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Días */}
      <div>
        <label className={labelClass}>Días</label>
        <div className="flex gap-1.5">
          {DAYS.map((day, i) => (
            <button key={day} type="button" onClick={() => toggleDay(i)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                dias.includes(i)
                  ? 'bg-gradient-to-b from-teal-400 to-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}>
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Inicio + Fin */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Inicio</label>
          <input type="time" value={inicio} onChange={e => setInicio(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fin</label>
          <input type="time" value={fin} onChange={e => setFin(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Botones */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={onCancel}
          className="py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all">
          Cancelar
        </button>
        <button onClick={handleAdd} disabled={!titulo.trim()}
          className="py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}>
          Añadir
        </button>
      </div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────
export default function OnboardingStep2() {
  const router = useRouter()
  const [compromisos, setCompromisos] = useState<Compromiso[]>([])
  const [showForm,    setShowForm]    = useState(false)

  const handleDelete  = (id: string) => setCompromisos(prev => prev.filter(c => c.id !== id))
  const handleSkip    = () => router.push('/dashboard')
  const handleContinue = () => router.push('/onboarding/step3')

  const tipoIcon: Record<string, React.ReactNode> = {
    clase:     <BookOpen className="w-3.5 h-3.5 text-teal-600" />,
    actividad: <Activity className="w-3.5 h-3.5 text-teal-600" />,
    otro:      <MoreHorizontal className="w-3.5 h-3.5 text-teal-600" />,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 flex flex-col items-center justify-start py-10 px-6">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
          <span className="text-white font-black text-lg">T</span>
        </div>
        <span className="text-xl font-bold text-gray-800">TaskIA</span>
      </div>

      <p className="text-gray-400 text-sm mb-6">Vamos a configurar tu planificador en 3 pasos</p>

      <Stepper current={1} />

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-lg p-6 space-y-4">

        <div>
          <h2 className="text-xl font-bold text-gray-900">Compromisos fijos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Añade clases, entrenamientos o cualquier actividad recurrente
          </p>
        </div>

        {/* Compromisos añadidos */}
        {compromisos.length > 0 && (
          <div className="space-y-2">
            {compromisos.map(c => (
              <div key={c.id}
                className="flex items-center justify-between px-4 py-2.5 bg-teal-50 border border-teal-100 rounded-2xl group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    {tipoIcon[c.tipo]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{c.titulo}</p>
                    <p className="text-xs text-gray-400">
                      {c.inicio} - {c.fin}
                      {c.dias.length > 0 && ` · ${c.dias.length} ${c.dias.length === 1 ? 'día' : 'días'}/semana`}
                    </p>
                  </div>
                </div>
                <button onClick={() => handleDelete(c.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Formulario inline o botón */}
        {showForm ? (
          <AddCompromisoForm
            onCancel={() => setShowForm(false)}
            onAdd={(c) => { setCompromisos(prev => [...prev, c]); setShowForm(false) }}
          />
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-200 rounded-2xl text-sm font-medium text-teal-500 hover:bg-teal-50 hover:border-teal-200 transition-all">
            <Plus className="w-4 h-4" />
            Añadir compromiso
          </button>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-1">
          <button onClick={handleSkip}
            className="px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all">
            Saltar por ahora
          </button>
          <button onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-200"
            style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}>
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 my-6">Paso 2 de 3</p>
    </div>
  )
}
