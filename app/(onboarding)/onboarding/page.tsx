'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Calendar, Target, ArrowRight, Lightbulb } from 'lucide-react'

const STORAGE_KEY = 'taskia_onboarding_step1'

const steps = [
  { label: 'Tu semana', sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos', sub: 'Exámenes y entregas', icon: Target },
]

const DAYS = ['Lun', 'Mar', 'Mi', 'Jue', 'Vie', 'Sáb', 'Dom']

const TIMEZONES = [
  'Europa/Madrid',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Santiago',
  'America/Lima',
  'America/Caracas',
]

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = i === current
        const isCompleted = i < current

        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center w-32">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 transition-all ${
                  isActive || isCompleted
                    ? 'bg-gradient-to-br from-teal-400 to-teal-600 shadow-md'
                    : 'bg-gray-100'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive || isCompleted ? 'text-white' : 'text-gray-400'
                  }`}
                />
              </div>

              <p
                className={`text-xs font-semibold text-center ${
                  isActive ? 'text-gray-800' : 'text-gray-400'
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
                className={`w-24 h-0.5 mb-8 ${
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

export default function OnboardingPage() {
  const router = useRouter()

  const [timezone, setTimezone] = useState('Europa/Madrid')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('22:00')
  const [studyDays, setStudyDays] = useState<number[]>([0, 1, 2, 3, 4])

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return

    try {
      const saved = JSON.parse(raw)
      setTimezone(saved.timezone ?? 'Europa/Madrid')
      setStartTime(saved.startTime ?? '08:00')
      setEndTime(saved.endTime ?? '22:00')
      setStudyDays(saved.studyDays ?? [0, 1, 2, 3, 4])
    } catch {}
  }, [])

  const toggleDay = (index: number) => {
    setStudyDays((prev) =>
      prev.includes(index)
        ? prev.filter((d) => d !== index)
        : [...prev, index].sort((a, b) => a - b)
    )
  }

  const persistStep = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        timezone,
        startTime,
        endTime,
        studyDays,
      })
    )
  }

  const handleContinue = () => {
    persistStep()
    router.push('/onboarding/step2')
  }

  const handleSkip = () => {
    persistStep()
    router.push('/onboarding/step2')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-md">
          <span className="text-white font-black text-lg">T</span>
        </div>
        <span className="text-xl font-bold text-gray-800">TaskIA</span>
      </div>

      <p className="text-gray-400 text-sm mb-8">
        Vamos a configurar tu planificador en 3 pasos
      </p>

      <Stepper current={0} />

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 w-full max-w-lg p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Configura tu semana</h2>
          <p className="text-sm text-gray-400 mt-1">
            Cuéntanos cómo es tu rutina habitual para organizar mejor tus tareas
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Zona horaria
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Tu día empieza a las
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Y termina a las
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-teal-100 focus:border-teal-300 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-3">
            ¿Qué días estudias normalmente?
          </label>

          <div className="flex gap-2">
            {DAYS.map((day, i) => {
              const isSelected = studyDays.includes(i)

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i)}
                  className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-b from-teal-400 to-teal-600 text-white shadow-md shadow-teal-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-gray-400 mt-2">
            Selecciona los días en los que planeas estudiar o hacer tareas
          </p>
        </div>

        <div className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3.5">
          <Lightbulb className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-teal-800">
              Tip: Puedes cambiar esto después
            </p>
            <p className="text-xs text-teal-600 mt-0.5">
              No te preocupes si tu horario varía. Esto es solo para empezar y
              puedes ajustarlo cuando quieras.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleSkip}
            className="px-6 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-all"
          >
            Saltar por ahora
          </button>

          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-semibold hover:opacity-90 transition-all shadow-md shadow-teal-200"
            style={{ background: 'linear-gradient(90deg, #14b8a6, #0f766e)' }}
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-300 mt-6">Paso 1 de 3</p>
    </div>
  )
}