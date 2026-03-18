'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Calendar, Target, ArrowRight, Plus, Trash2, Sparkles, GraduationCap, FileText } from 'lucide-react'

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

interface Objetivo {
  id: string
  tipo: 'examen' | 'entrega'
  titulo: string
  materia: string
  fecha: string
  prioridad: 'Alta' | 'Media' | 'Baja'
}

function AddObjetivoForm({ onCancel, onAdd }: {
  onCancel: () => void
  onAdd: (o: Objetivo) => void
}) {
  const [tipo,      setTipo]      = useState<'examen' | 'entrega'>('examen')
  const [titulo,    setTitulo]    = useState('')
  const [materia,   setMateria]   = useState('')
  const [fecha,     setFecha]     = useState('')
  const [prioridad, setPrioridad] = useState<'Alta' | 'Media' | 'Baja'>('Media')

  const handleAdd = () => {
    if (!titulo.trim()) return
    onAdd({ id: crypto.randomUUID(), tipo, titulo: titulo.trim(), materia: materia.trim() || 'General', fecha, prioridad })
  }

  const inputClass = "w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all placeholder-gray-300"

  return (
    <div className="border border-gray-200 rounded-2xl p-4 space-y-3 bg-white">

      {/* Tipo */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Tipo</p>
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'examen',  label: 'Examen',  Icon: GraduationCap },
            { key: 'entrega', label: 'Entrega', Icon: FileText },
          ] as const).map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setTipo(key)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-sm font-medium transition-all ${
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

      {/* Título */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Título</p>
        <input type="text" placeholder="Ej: Examen de Historia del Arte"
          value={titulo} onChange={e => setTitulo(e.target.value)}
          className={inputClass} autoFocus />
      </div>

      {/* Materia */}
      <div>
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Materia</p>
        <input type="text" placeholder="Ej: Historia"
          value={materia} onChange={e => setMateria(e.target.value)}
          className={inputClass} />
      </div>

      {/* Fecha + Prioridad */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Fecha</p>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputClass} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Prioridad</p>
          <select value={prioridad} onChange={e => setPrioridad(e.target.value as any)} className={inputClass}>
            <option value="Alta">Alta</option>
            <option value="Media">Media</option>
            <option value="Baja">Baja</option>
          </select>
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

export default function OnboardingStep3() {
  const router = useRouter()
  const [objetivos, setObjetivos] = useState<Objetivo[]>([])
  const [showForm,  setShowForm]  = useState(false)

  const handleDelete = (id: string) => setObjetivos(prev => prev.filter(o => o.id !== id))
  const handleFinish = () => router.push('/dashboard')

  const prioridadColor: Record<string, string> = {
    Alta:  'text-red-500 bg-red-50',
    Media: 'text-yellow-600 bg-yellow-50',
    Baja:  'text-green-600 bg-green-50',
  }

  return (
    // ✅ Fix: justify-start + py-8 para que haga scroll natural sin quedar cortado
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 flex flex-col items-center justify-start py-10 px-6">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
          <span className="text-white font-black text-lg">T</span>
        </div>
        <span className="text-xl font-bold text-gray-800">TaskIA</span>
      </div>

      <p className="text-gray-400 text-sm mb-6">Vamos a configurar tu planificador en 3 pasos</p>

      <Stepper current={2} />

      {/* Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-lg p-6 space-y-4">

        <div>
          <h2 className="text-xl font-bold text-gray-900">Tus objetivos próximos</h2>
          <p className="text-sm text-gray-400 mt-1">
            Añade exámenes y entregas importantes para que TaskIA te ayude a planificar
          </p>
        </div>

        {/* Objetivos añadidos */}
        {objetivos.length > 0 && (
          <div className="space-y-2">
            {objetivos.map(o => (
              <div key={o.id}
                className="flex items-center justify-between px-4 py-2.5 bg-teal-50 border border-teal-100 rounded-2xl group">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                    {o.tipo === 'examen'
                      ? <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                      : <FileText className="w-3.5 h-3.5 text-teal-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{o.titulo}</p>
                    <p className="text-xs text-gray-400">
                      {o.materia}{o.fecha && ` · ${new Date(o.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${prioridadColor[o.prioridad]}`}>
                    {o.prioridad}
                  </span>
                  <button onClick={() => handleDelete(o.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Formulario inline o botón */}
        {showForm ? (
          <AddObjetivoForm
            onCancel={() => setShowForm(false)}
            onAdd={(o) => { setObjetivos(prev => [...prev, o]); setShowForm(false) }}
          />
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-200 rounded-2xl text-sm font-medium text-teal-500 hover:bg-teal-50 hover:border-teal-200 transition-all">
            <Plus className="w-4 h-4" />
            Añadir objetivo
          </button>
        )}

        {/* Banner IA */}
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700">La IA te ayudará</p>
            <p className="text-xs text-orange-500 mt-0.5">
              TaskIA usará estos objetivos para sugerirte sesiones de estudio y optimizar tu planificación automáticamente.
            </p>
          </div>
        </div>

        {/* Botones finales */}
        <div className="flex gap-3">
          <button onClick={handleFinish}
            className="px-5 py-2.5 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all">
            Configurar después
          </button>
          <button onClick={handleFinish}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-200"
            style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}>
            ¡Empezar a usar TaskIA!
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 my-6">Paso 3 de 3</p>
    </div>
  )
}
