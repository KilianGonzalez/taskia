"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const redirectTo = searchParams.get('redirectTo')
    if (redirectTo) {
      // Guardar la redirección para después del login
      sessionStorage.setItem('redirectTo', redirectTo)
    }
  }, [searchParams])

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return "El email es requerido"
    if (!emailRegex.test(email)) return "Formato de email inválido"
    return ""
  }

  const validatePassword = (password: string) => {
    if (!password) return "La contraseña es requerida"
    if (password.length < 6) return "La contraseña debe tener al menos 6 caracteres"
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "La contraseña debe tener mayúsculas, minúsculas y números"
    }
    return ""
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEmailError("")
    setPasswordError("")

    // Validaciones
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    
    if (emailValidation) {
      setEmailError(emailValidation)
      return
    }
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      const redirectTo = sessionStorage.getItem('redirectTo') || '/dashboard'
      sessionStorage.removeItem('redirectTo')
      router.push(redirectTo)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEmailError("")
    setPasswordError("")

    // Validaciones
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)
    
    if (emailValidation) {
      setEmailError(emailValidation)
      return
    }
    if (passwordValidation) {
      setPasswordError(passwordValidation)
      return
    }
    if (password !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden")
      return
    }
    if (!acceptTerms) {
      setError("Debes aceptar los términos y condiciones")
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setError("Revisa tu email para confirmar el registro")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            TaskIA
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Crea tu cuenta para organizar tu semana" : "Inicia sesión para organizar tu semana de estudio"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={isSignUp ? handleSignUp : handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={emailError ? "border-destructive" : ""}
                required
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={passwordError ? "border-destructive pr-10" : "pr-10"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {isSignUp && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="terms" 
                  checked={acceptTerms}
                  onCheckedChange={(checked: boolean) => setAcceptTerms(checked)}
                />
                <Label 
                  htmlFor="terms" 
                  className="text-sm text-muted-foreground"
                >
                  Acepto los términos y condiciones
                </Label>
              </div>
            )}

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? (isSignUp ? "Creando cuenta..." : "Iniciando sesión...") : (isSignUp ? "Crear cuenta" : "Iniciar sesión")}
              </Button>
            </div>
          </form>

          <div className="text-center">
            <Button 
              type="button" 
              variant="ghost" 
              className="text-sm"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setError("")
                setEmailError("")
                setPasswordError("")
              }}
            >
              {isSignUp ? "¿Ya tienes cuenta? Inicia sesión" : "¿No tienes cuenta? Regístrate"}
            </Button>
          </div>

          <Separator />

          <Button 
            variant="outline" 
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar con Google
          </Button>

          {!isSignUp && (
            <div className="text-center">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-sm text-muted-foreground"
                onClick={() => setError("Función de recuperación de contraseña próximamente")}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
