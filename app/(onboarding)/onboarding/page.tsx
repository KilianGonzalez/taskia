'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Calendar, Clock, Lightbulb, Target } from 'lucide-react'

const STORAGE_KEY = 'taskia_onboarding_step1'

const steps = [
  { label: 'Tu semana', sub: 'Configura tu horario', icon: Clock },
  { label: 'Compromisos fijos', sub: 'Clases y actividades', icon: Calendar },
  { label: 'Objetivos', sub: 'Examenes y entregas', icon: Target },
]

const DAYS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']

const TIMEZONES = [
  'Europa/Madrid',
  'America/Mexico_City',
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Santiago',
  'America/Lima',
  'America/Caracas',
]

type Step1FormState = {
  timezone: string
  startTime: string
  endTime: string
  studyDays: number[]
}

const DEFAULT_STEP1_STATE: Step1FormState = {
  timezone: 'Europa/Madrid',
  startTime: '08:00',
  endTime: '22:00',
  studyDays: [0, 1, 2, 3, 4],
}

function getStoredStep1State(): Step1FormState {
  if (typeof window === 'undefined') return DEFAULT_STEP1_STATE

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_STEP1_STATE

  try {
    const saved = JSON.parse(raw) as Partial<Step1FormState>
    return {
      timezone: typeof saved.timezone === 'string' ? saved.timezone : DEFAULT_STEP1_STATE.timezone,
      startTime: typeof saved.startTime === 'string' ? saved.startTime : DEFAULT_STEP1_STATE.startTime,
      endTime: typeof saved.endTime === 'string' ? saved.endTime : DEFAULT_STEP1_STATE.endTime,
      studyDays: Array.isArray(saved.studyDays)
        ? saved.studyDays.filter((day): day is number => typeof day === 'number')
        : DEFAULT_STEP1_STATE.studyDays,
    }
  } catch {
    return DEFAULT_STEP1_STATE
  }
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon
        const isActive = i === current
        const isCompleted = i < current

        return (
          <div key={step.label} className="flex items-center">
            <div className="flex w-32 flex-col items-center">
              <div
                className={`mb-2 flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive || isCompleted
                    ? 'brand-gradient text-white shadow-md'
                    : 'bg-muted text-muted-foreground'
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

export default function OnboardingPage() {
  const router = useRouter()
  const [stepState, setStepState] = useState<Step1FormState>(getStoredStep1State)

  const toggleDay = (index: number) => {
    setStepState((prev) => ({
      ...prev,
      studyDays: prev.studyDays.includes(index)
        ? prev.studyDays.filter((day) => day !== index)
        : [...prev.studyDays, index].sort((a, b) => a - b),
    }))
  }

  const updateStepState = <Key extends keyof Step1FormState>(key: Key, value: Step1FormState[Key]) => {
    setStepState((prev) => ({ ...prev, [key]: value }))
  }

  const { timezone, startTime, endTime, studyDays } = stepState

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

  return (
    <div className="min-h-screen section-enter bg-gradient-to-br from-slate-50 via-teal-50/30 to-blue-50/20 px-6 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        <div className="mb-8 flex items-center gap-3">
          <div className="brand-gradient flex h-10 w-10 items-center justify-center rounded-xl shadow-md">
            <span className="text-lg font-black text-white">T</span>
          </div>
          <span className="text-xl font-bold text-foreground">TaskIA</span>
        </div>

        <p className="mb-8 text-sm text-muted-foreground">Vamos a configurar tu planificador en 3 pasos</p>

        <Stepper current={0} />

        <div className="surface-card-strong w-full max-w-xl space-y-6 p-8">
          <div>
            <h2 className="text-xl font-bold text-foreground">Configura tu semana</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuentanos como es tu rutina para organizar mejor tus tareas.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Zona horaria</label>
            <select
              value={timezone}
              onChange={(e) => updateStepState('timezone', e.target.value)}
              className="w-full rounded-2xl border border-input bg-background/85 px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30"
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
              <label className="mb-2 block text-sm font-medium text-foreground">Tu dia empieza</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => updateStepState('startTime', e.target.value)}
                className="w-full rounded-2xl border border-input bg-background/85 px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Tu dia termina</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => updateStepState('endTime', e.target.value)}
                className="w-full rounded-2xl border border-input bg-background/85 px-4 py-3 text-sm text-foreground outline-none transition-all focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-medium text-foreground">Que dias estudias normalmente?</label>
            <div className="flex gap-2">
              {DAYS.map((day, i) => {
                const isSelected = studyDays.includes(i)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex-1 rounded-2xl py-3 text-sm font-semibold transition-all duration-300 ${
                      isSelected
                        ? 'brand-gradient text-white shadow-md'
                        : 'bg-muted text-muted-foreground hover:bg-muted/75'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Selecciona los dias de estudio habituales.</p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-teal-200/70 bg-teal-50/80 px-4 py-3.5 dark:border-teal-900 dark:bg-teal-950/35">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-teal-800 dark:text-teal-200">Tip: puedes cambiar esto despues</p>
              <p className="mt-0.5 text-xs text-teal-700 dark:text-teal-300">Empieza simple y ajusta el horario cuando quieras.</p>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-2xl border border-input px-6 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/60"
            >
              Saltar por ahora
            </button>

            <button
              type="button"
              onClick={handleContinue}
              className="brand-gradient flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">Paso 1 de 3</p>
      </div>
    </div>
  )
}
