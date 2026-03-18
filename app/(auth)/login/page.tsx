'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async () => {
    setLoading(true)
    if (tab === 'register') {
      if (!acceptTerms) {
        alert('Debes aceptar los términos y condiciones.')
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) alert('Error al registrarse: ' + error.message)
      else {
        alert('¡Registro exitoso! Revisa tu email para confirmar tu cuenta.')
        setTab('login')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('Error al iniciar sesión: ' + error.message)
      else {
        router.refresh()
        router.push('/dashboard')
      }
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'linear-gradient(160deg, #eaf7f5 0%, #eef4fb 50%, #f0eef8 100%)' }}
    >

      {/* ── PANEL IZQUIERDO (Decorativo) ── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-end justify-center pb-16">

        {/* Contenedor centrado del grupo de formas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-[30rem] h-[30rem]">

            {/* Forma 1: Grande verde/teal semitransparente */}
            <div
              className="absolute w-72 h-72 rounded-[3.5rem] animate-float-slow"
              style={{
                background: 'linear-gradient(145deg, rgba(94,207,202,0.65) 0%, rgba(74,184,196,0.60) 50%, rgba(107,174,214,0.65) 100%)',
                top: '0',
                left: '0',
                boxShadow: '0 30px 80px rgba(78,180,170,0.20)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Forma 2: Mediana azul/morado semitransparente */}
            <div
              className="absolute w-64 h-64 rounded-[3.5rem] animate-float-medium"
              style={{
                background: 'linear-gradient(145deg, rgba(90,130,195,0.55) 0%, rgba(100,110,185,0.50) 100%)',
                backdropFilter: 'blur(12px)',
                bottom: '0',
                right: '0',
                boxShadow: '0 30px 80px rgba(100,120,200,0.15)',
              }}
            />

            {/* Badge estrella - esquina superior derecha */}
            <div
              className="absolute bg-white rounded-2xl shadow-xl w-16 h-16 flex items-center justify-center animate-float-badge z-20"
              style={{ top: '-1.5rem', right: '3rem' }}
            >
              <span className="text-3xl" style={{ color: '#f5a623' }}>✦</span>
            </div>

            {/* Badge colores - esquina inferior izquierda */}
            <div
              className="absolute bg-white rounded-2xl shadow-xl w-16 h-16 flex items-center justify-center animate-float-slow z-20"
              style={{ bottom: '-1.5rem', left: '3rem' }}
            >
              <div className="w-8 h-8 grid grid-cols-2 gap-1">
                <div className="rounded-sm" style={{ background: 'linear-gradient(135deg,#e85d5d,#e8855d)' }} />
                <div className="rounded-sm" style={{ background: 'linear-gradient(135deg,#5d8fe8,#5dc4e8)' }} />
                <div className="rounded-sm" style={{ background: 'linear-gradient(135deg,#5de87a,#5de8c4)' }} />
                <div className="rounded-sm" style={{ background: 'linear-gradient(135deg,#e8d45d,#e8a55d)' }} />
              </div>
            </div>

          </div>
        </div>

        {/* Texto inferior */}
        <div className="relative z-10 text-center">
          <h1 className="text-3xl font-bold text-[#1a2a4a]">Bienvenido a TaskIA</h1>
          <p className="text-sm text-[#4a6080] mt-2">Organiza tu semana de forma inteligente</p>
        </div>
      </div>

      {/* ── PANEL DERECHO (Formulario) ── */}
      <div className="lg:w-[55%] flex flex-col items-center justify-center px-6 py-12">
        <div className="w-[75%] bg-white rounded-3xl shadow-2xl shadow-gray-300/60 px-10 py-12">

          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-full p-1 mb-8">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                tab === 'login'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200 ${
                tab === 'register'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <div className="space-y-5">

            {/* Campo: Nombre (solo en registro) */}
            {tab === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre completo
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Tu nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Campo: Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Campo: Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={tab === 'register' ? 'Mínimo 6 caracteres' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Recordarme / Términos */}
            {tab === 'login' ? (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Recordarme</span>
                </label>
                <button className="text-sm font-medium text-emerald-600 hover:underline">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            ) : (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  Acepto los{' '}
                  <span className="font-medium text-emerald-600 hover:underline cursor-pointer">
                    términos y condiciones
                  </span>
                  {' '}y la{' '}
                  <span className="font-medium text-emerald-600 hover:underline cursor-pointer">
                    política de privacidad
                  </span>
                </span>
              </label>
            )}

            {/* Botón principal */}
            <button
              onClick={handleAuth}
              disabled={loading}
              className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
              style={{ background: 'linear-gradient(90deg, #4ecdc4 0%, #6b8fda 100%)' }}
            >
              {loading
                ? 'Procesando...'
                : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'
              }
            </button>

            {/* Separador */}
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-gray-400">O continúa con</span>
              </div>
            </div>

            {/* Botón Google */}
            <button
              onClick={handleGoogleLogin}
              className="w-full py-3.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 flex items-center justify-center gap-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>

            {/* Link inferior */}
            <p className="text-center text-sm text-gray-500 mt-2">
              {tab === 'login' ? (
                <>
                  ¿No tienes cuenta?{' '}
                  <button
                    onClick={() => setTab('register')}
                    className="font-semibold text-emerald-600 hover:underline"
                  >
                    Créala gratis
                  </button>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => setTab('login')}
                    className="font-semibold text-emerald-600 hover:underline"
                  >
                    Inicia sesión
                  </button>
                </>
              )}
            </p>

          </div>

          {/* Volver a inicio */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a la página principal
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
