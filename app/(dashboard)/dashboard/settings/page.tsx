'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useTheme } from 'next-themes'
import { BarChart2, Bell, Calendar, Clock, Mail, Moon, Save, Sparkles, Sun } from 'lucide-react'

const emptySubscribe = () => () => {}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-emerald-500' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="app-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/70 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">{icon}</div>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="divide-y divide-border/70">{children}</div>
    </div>
  )
}

function Row({
  icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/35">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const darkMode = mounted ? theme === 'dark' : false
  const [persistingTheme, setPersistingTheme] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const hasSyncedThemeFromProfile = useRef(false)

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [pushNotifications, setPushNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(false)
  const [taskReminders, setTaskReminders] = useState(true)
  const [dailySummary, setDailySummary] = useState(true)
  const [weeklySummary, setWeeklySummary] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(true)

  const [startDay, setStartDay] = useState<'lunes' | 'domingo' | 'sabado'>('lunes')
  const [studyTimeStart, setStudyTimeStart] = useState('15:00')
  const [studyTimeEnd, setStudyTimeEnd] = useState('19:00')

  useEffect(() => {
    let cancelled = false

    const syncThemeFromProfile = async () => {
      if (!mounted || hasSyncedThemeFromProfile.current) {
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle()

      const preferredDarkMode = profile?.preferences?.darkMode
      if (cancelled || typeof preferredDarkMode !== 'boolean') {
        hasSyncedThemeFromProfile.current = true
        return
      }

      hasSyncedThemeFromProfile.current = true
      setTheme(preferredDarkMode ? 'dark' : 'light')
    }

    void syncThemeFromProfile()

    return () => {
      cancelled = true
    }
  }, [mounted, setTheme, supabase])

  const persistThemePreference = async (enabled: boolean) => {
    setPersistingTheme(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setPersistingTheme(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferences')
      .eq('id', user.id)
      .maybeSingle()

    await supabase.from('profiles').upsert(
      {
        id: user.id,
        preferences: {
          ...(profile?.preferences ?? {}),
          darkMode: enabled,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    setPersistingTheme(false)
  }

  const handleSave = () => {
    setSettingsSaved(true)
    setTimeout(() => setSettingsSaved(false), 3000)
  }

  return (
    <div className="space-y-6">
      <div className="app-header">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuracion</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Personaliza tu experiencia en TaskIA</p>
        </div>

        <button onClick={handleSave} className="app-button-gradient flex items-center gap-2">
          <Save className="h-4 w-4" />
          {settingsSaved ? 'Guardado' : 'Guardar cambios'}
        </button>
      </div>

      <Section icon={<Bell className="h-4 w-4 text-primary" />} title="Notificaciones">
        <Row icon={<Bell className="h-4 w-4" />} label="Notificaciones push" description="Alertas en tu dispositivo" enabled={pushNotifications} onChange={setPushNotifications} />
        <Row icon={<Mail className="h-4 w-4" />} label="Notificaciones por email" description="Resumenes y alertas por correo" enabled={emailNotifications} onChange={setEmailNotifications} />
        <Row icon={<Clock className="h-4 w-4" />} label="Recordatorio de tareas" description="30 min antes de cada tarea" enabled={taskReminders} onChange={setTaskReminders} />
        <Row icon={<Calendar className="h-4 w-4" />} label="Resumen diario" description="Cada manana a las 8:00" enabled={dailySummary} onChange={setDailySummary} />
        <Row icon={<BarChart2 className="h-4 w-4" />} label="Informe semanal" description="Resumen cada domingo" enabled={weeklySummary} onChange={setWeeklySummary} />
        <Row icon={<Sparkles className="h-4 w-4" />} label="Sugerencias de IA" description="Consejos personalizados de estudio" enabled={aiSuggestions} onChange={setAiSuggestions} />
      </Section>

      <Section icon={<Clock className="h-4 w-4 text-emerald-500" />} title="Horario de estudio">
        <div className="px-6 py-4">
          <p className="mb-3 text-sm font-medium text-foreground">Inicio de semana</p>
          <div className="flex flex-wrap gap-2">
            {(['lunes', 'domingo', 'sabado'] as const).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setStartDay(day)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-all ${
                  startDay === day ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/75'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="mb-3 text-sm font-medium text-foreground">Franja horaria de estudio</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Hora de inicio</label>
              <input type="time" value={studyTimeStart} onChange={(event) => setStudyTimeStart(event.target.value)} className="app-input bg-muted/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Hora de fin</label>
              <input type="time" value={studyTimeEnd} onChange={(event) => setStudyTimeEnd(event.target.value)} className="app-input bg-muted/20" />
            </div>
          </div>
        </div>
      </Section>

      <Section icon={<Sun className="h-4 w-4 text-amber-500" />} title="Apariencia">
        <div className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/35">
          <div className="flex items-center gap-3">
            <div className="text-muted-foreground">{mounted && darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</div>
            <div>
              <p className="text-sm font-medium text-foreground">Modo oscuro</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Cambia el tema de la aplicacion</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2">
            {persistingTheme ? <Clock className="h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
            <Toggle
              enabled={darkMode}
              onChange={(value) => {
                setTheme(value ? 'dark' : 'light')
                void persistThemePreference(value)
              }}
            />
          </div>
        </div>
      </Section>
    </div>
  )
}
