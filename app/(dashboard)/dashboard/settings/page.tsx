'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Bell, Mail, Clock, Calendar,
  BarChart2, Sparkles, Save, Moon, Sun,
} from 'lucide-react'

// ── Toggle ─────────────────────────────────────────────
interface ToggleProps {
  enabled: boolean
  onChange: (val: boolean) => void
}

function Toggle({ enabled, onChange }: ToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Section ────────────────────────────────────────────
interface SectionProps {
  icon: React.ReactNode
  title: string
  bg: string
  children: React.ReactNode
}

function Section({ icon, title, bg, children }: SectionProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 dark:border-gray-800">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
          {icon}
        </div>
        <h2 className="font-semibold text-[#0f172a] dark:text-white">{title}</h2>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {children}
      </div>
    </div>
  )
}

// ── SettingRow ─────────────────────────────────────────
interface SettingRowProps {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (val: boolean) => void
}

function SettingRow({ icon, label, description, enabled, onChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="text-gray-400 dark:text-gray-500 shrink-0">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────
export default function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // ✅ Fix hydration: esperar al mount para leer el tema real
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const darkMode = mounted ? theme === 'dark' : false

  // Notificaciones
  const [pushNotifications,  setPushNotifications]  = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [taskReminders,      setTaskReminders]      = useState(true)
  const [dailySummary,       setDailySummary]       = useState(true)
  const [weeklySummary,      setWeeklySummary]      = useState(false)
  const [aiSuggestions,      setAiSuggestions]      = useState(true)

  // Horario
  const [startDay,       setStartDay]       = useState<'lunes' | 'domingo' | 'sabado'>('lunes')
  const [studyTimeStart, setStudyTimeStart] = useState('15:00')
  const [studyTimeEnd,   setStudyTimeEnd]   = useState('19:00')

  const handleSave = () => {
    alert('¡Configuración guardada!')
  }

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-gray-950 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0f172a] dark:text-white">Configuración</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
            Personaliza tu experiencia en TaskIA
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-all"
          style={{ background: 'linear-gradient(90deg, #1e2d5e, #2d4a8a)' }}
        >
          <Save className="w-4 h-4" />
          Guardar cambios
        </button>
      </div>

      {/* Notificaciones */}
      <Section
        icon={<Bell className="w-4 h-4 text-indigo-600" />}
        title="Notificaciones"
        bg="bg-indigo-50"
      >
        <SettingRow icon={<Bell className="w-4 h-4" />}      label="Notificaciones push"      description="Alertas en tu dispositivo"            enabled={pushNotifications}  onChange={setPushNotifications} />
        <SettingRow icon={<Mail className="w-4 h-4" />}      label="Notificaciones por email"  description="Resúmenes y alertas por correo"       enabled={emailNotifications} onChange={setEmailNotifications} />
        <SettingRow icon={<Clock className="w-4 h-4" />}     label="Recordatorio de tareas"   description="30 min antes de cada tarea"           enabled={taskReminders}      onChange={setTaskReminders} />
        <SettingRow icon={<Calendar className="w-4 h-4" />}  label="Resumen diario"           description="Cada mañana a las 8:00"               enabled={dailySummary}       onChange={setDailySummary} />
        <SettingRow icon={<BarChart2 className="w-4 h-4" />} label="Informe semanal"          description="Resumen cada domingo"                 enabled={weeklySummary}      onChange={setWeeklySummary} />
        <SettingRow icon={<Sparkles className="w-4 h-4" />}  label="Sugerencias de IA"        description="Consejos personalizados de estudio"   enabled={aiSuggestions}      onChange={setAiSuggestions} />
      </Section>

      {/* Horario de estudio */}
      <Section
        icon={<Clock className="w-4 h-4 text-emerald-600" />}
        title="Horario de estudio"
        bg="bg-emerald-50"
      >
        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Inicio de semana</p>
          <div className="flex gap-2">
            {(['lunes', 'domingo', 'sabado'] as const).map((day) => (
              <button
                key={day}
                onClick={() => setStartDay(day)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  startDay === day
                    ? 'bg-[#1e2d5e] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Franja horaria de estudio</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 block">Hora de inicio</label>
              <input
                type="time"
                value={studyTimeStart}
                onChange={(e) => setStudyTimeStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 dark:text-gray-500 mb-1.5 block">Hora de fin</label>
              <input
                type="time"
                value={studyTimeEnd}
                onChange={(e) => setStudyTimeEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* Apariencia */}
      {/* ✅ Fix: icono del Section siempre Sun para evitar hydration mismatch */}
      <Section
        icon={<Sun className="w-4 h-4 text-orange-500" />}
        title="Apariencia"
        bg="bg-orange-50"
      >
        <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-3">
            {/* ✅ Icono interior sí puede ser condicional — está dentro del cliente montado */}
            <div className="text-gray-400 dark:text-gray-500">
              {mounted && darkMode
                ? <Moon className="w-4 h-4" />
                : <Sun className="w-4 h-4" />
              }
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Modo oscuro</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Cambia el tema de la aplicación</p>
            </div>
          </div>
          <Toggle
            enabled={darkMode}
            onChange={(val) => setTheme(val ? 'dark' : 'light')}
          />
        </div>
      </Section>

    </div>
  )
}