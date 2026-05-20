'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Moon,
  Save,
  Sun,
  Target,
  TrendingUp,
  User,
} from 'lucide-react'
import { UserAvatar } from '@/components/shared/user-avatar'

type ProfilePreferences = {
  avatar_url?: string | null
  notifications?: boolean
  darkMode?: boolean
} & Record<string, unknown>

type ProfileScreenProps = {
  user: {
    id: string
    email?: string | null
    fullName?: string | null
    avatarUrl?: string | null
  }
  profile?: {
    display_name?: string | null
    timezone?: string | null
    preferences?: ProfilePreferences | null
  } | null
  stats: {
    completedTasks: number
    currentStreak: number
    achievedGoals: number
  }
}

const emptySubscribe = () => () => {}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-primary' : 'bg-muted'
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

export default function ProfileScreen({ user, profile, stats }: ProfileScreenProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const darkMode = mounted ? theme === 'dark' : false

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  )

  const [displayName, setDisplayName] = useState(profile?.display_name ?? user.fullName ?? '')
  const [timezone, setTimezone] = useState(profile?.timezone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.preferences?.avatar_url ?? user.avatarUrl ?? '')
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.preferences?.notifications ?? true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const hasSyncedThemeFromProfile = useRef(false)

  useEffect(() => {
    if (!mounted || hasSyncedThemeFromProfile.current) {
      return
    }

    const preferredDarkMode = profile?.preferences?.darkMode
    if (typeof preferredDarkMode !== 'boolean') {
      hasSyncedThemeFromProfile.current = true
      return
    }

    hasSyncedThemeFromProfile.current = true
    setTheme(preferredDarkMode ? 'dark' : 'light')
  }, [mounted, profile?.preferences?.darkMode, setTheme])

  const persistThemePreference = async (enabled: boolean) => {
    await supabase.from('profiles').upsert(
      {
        id: user.id,
        preferences: {
          ...profile?.preferences,
          darkMode: enabled,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
  }

  const profileStats = [
    { icon: CheckCircle2, label: 'Tareas completadas', value: String(stats.completedTasks), tone: 'text-emerald-600 dark:text-emerald-300' },
    { icon: TrendingUp, label: 'Racha actual', value: String(stats.currentStreak), tone: 'text-primary' },
    { icon: Target, label: 'Objetivos logrados', value: String(stats.achievedGoals), tone: 'text-cyan-600 dark:text-cyan-300' },
  ]

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      setAvatarUrl(data.publicUrl)
    }

    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    const nextPreferences = {
      ...profile?.preferences,
      avatar_url: avatarUrl,
      notifications: notificationsEnabled,
      darkMode,
    }

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName,
      timezone,
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)

    if (!error) {
      setSaveMessage({ type: 'success', text: 'Perfil actualizado correctamente.' })
      router.refresh()
      return
    }

    setSaveMessage({ type: 'error', text: `Error guardando perfil: ${error.message}` })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-5xl space-y-6 section-enter">
        <div className="app-header">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </button>

          <button onClick={handleSave} disabled={saving || uploading} className="app-button-gradient inline-flex items-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        <div className="app-card-strong p-6 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
                <UserAvatar avatarUrl={avatarUrl} name={displayName || user.fullName} fallbackClassName="bg-transparent text-xl" />
              </div>

              <label className="absolute -bottom-1 -right-1 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-primary shadow-sm transition-all hover:-translate-y-0.5">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-foreground">{displayName || user.fullName || 'Usuario'}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email ?? 'Sin email'}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 stagger-in">
            {profileStats.map((stat) => {
              const Icon = stat.icon

              return (
                <div key={stat.label} className="app-card p-4">
                  <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
                    <Icon className={`h-4 w-4 ${stat.tone}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="app-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Cuenta</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Nombre visible</label>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="app-input" placeholder="Tu nombre" />
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">Zona horaria</label>
                <input value={timezone} onChange={(event) => setTimezone(event.target.value)} className="app-input" placeholder="Europe/Madrid" />
              </div>
            </div>
          </div>

          <div className="app-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Preferencias</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">Notificaciones</p>
                  <p className="text-xs text-muted-foreground">Activa alertas de tareas y objetivos</p>
                </div>
                <Toggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-muted-foreground">{darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">Modo oscuro</p>
                    <p className="text-xs text-muted-foreground">Tema de la aplicacion</p>
                  </div>
                </div>
                <Toggle
                  enabled={darkMode}
                  onChange={(value) => {
                    setTheme(value ? 'dark' : 'light')
                    void persistThemePreference(value)
                  }}
                />
              </div>

              <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Ultima actualizacion sincronizada al guardar cambios.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {saveMessage ? (
          <div className={`rounded-xl border px-3 py-2.5 text-sm ${
            saveMessage.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          }`}>
            {saveMessage.text}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:hover:border-red-900 dark:hover:bg-red-950/30 dark:hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  )
}
