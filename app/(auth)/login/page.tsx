'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  const handleAuth = async () => {
    setLoading(true)

    if (tab === 'register') {
      if (!acceptTerms) {
        alert('Debes aceptar los terminos y condiciones.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })

      if (error) {
        alert('Error al registrarse: ' + error.message)
        setLoading(false)
        return
      }

      if (data.session) {
        router.refresh()
        router.push('/dashboard')
        setLoading(false)
        return
      }

      alert('Registro exitoso. Revisa tu email para confirmar tu cuenta.')
      setTab('login')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert('Error al iniciar sesion: ' + error.message)
      setLoading(false)
      return
    }

    router.refresh()
    router.push('/dashboard')
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <main className="min-h-screen px-4 py-10 section-enter">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Link>

        <div className="surface-card-strong p-6 sm:p-8">
          <div className="mb-7 text-center item-enter">
            <div className="brand-gradient mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg">
              <span className="text-lg font-black text-white">T</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">
              {tab === 'login' ? 'Bienvenido a TaskIA' : 'Crea tu cuenta'}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Organiza tu semana de estudio con un flujo claro y sin friccion.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-2xl border border-border bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                tab === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              Registrarse
            </button>
          </div>

          <div className="space-y-4">
            {tab === 'register' && (
              <Field
                icon={<User className="h-4 w-4" />}
                label="Nombre"
                value={name}
                onChange={setName}
                placeholder="Tu nombre"
              />
            )}

            <Field
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={email}
              onChange={setEmail}
              type="email"
              placeholder="tu@email.com"
            />

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Contrasena</label>
              <div className="flex items-center gap-2 rounded-2xl border border-input bg-background/80 px-4 py-3 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {tab === 'register' && (
              <label className="flex items-start gap-3 rounded-2xl border border-border bg-muted/45 px-4 py-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1"
                />
                <span>Acepto los terminos y condiciones.</span>
              </label>
            )}

            <button
              type="button"
              onClick={handleAuth}
              disabled={loading}
              className="brand-gradient w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Procesando...' : tab === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">O continua con</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continuar con Google
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

type FieldProps = {
  icon: ReactNode
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
}

function Field({ icon, label, value, onChange, placeholder, type = 'text' }: FieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center gap-2 rounded-2xl border border-input bg-background/80 px-4 py-3 transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
        <span className="text-muted-foreground">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </div>
  )
}
