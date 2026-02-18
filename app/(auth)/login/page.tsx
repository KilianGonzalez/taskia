'use client'

import { createBrowserClient } from '@supabase/ssr'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // Estado para alternar modos
  const router = useRouter()
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleAuth = async () => {
    setLoading(true)
    
    if (isSignUp) {
      // --- Lógica de REGISTRO ---
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) {
        alert("Error al registrarse: " + error.message)
      } else {
        alert("¡Registro exitoso! Por favor, revisa tu email para confirmar tu cuenta.")
        setIsSignUp(false) // Volver al login
      }
    } else {
      // --- Lógica de LOGIN ---
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        alert("Error al entrar: " + error.message)
      } else {
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
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-xl shadow-lg border">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[hsl(236,49%,22%)]">
            {isSignUp ? "Crea tu cuenta" : "Bienvenido a TaskIA"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isSignUp 
              ? "Empieza a organizar tu vida hoy mismo" 
              : "Inicia sesión para ver tu agenda"}
          </p>
        </div>
        
        <div className="space-y-4 mt-8">
          <div className="space-y-2">
            <Input 
              type="email" 
              placeholder="Email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
            <Input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11"
            />
          </div>

          <Button 
            className="w-full h-11 bg-[hsl(236,49%,22%)] hover:bg-[hsl(236,49%,30%)] text-white font-medium"
            onClick={handleAuth}
            disabled={loading}
          >
            {loading 
              ? "Procesando..." 
              : (isSignUp ? "Registrarse" : "Entrar con Email")
            }
          </Button>

          {/* Toggle entre Login y Registro */}
          <div className="text-center text-sm">
            <span className="text-gray-500">
              {isSignUp ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            </span>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="font-medium text-[hsl(236,49%,22%)] hover:underline"
            >
              {isSignUp ? "Inicia sesión" : "Regístrate"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">O continúa con</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-11 font-medium"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </Button>
        </div>
      </div>
    </div>
  )
}


