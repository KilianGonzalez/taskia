'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthError() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/login')
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen bg-background px-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="app-card-strong w-full space-y-4 p-6 text-center section-enter">
          <h1 className="text-2xl font-bold text-destructive">Error de autenticacion</h1>
          <p className="text-muted-foreground">
            Hubo un error al procesar tu autenticacion. Seras redirigido al login.
          </p>
          <button onClick={() => router.push('/login')} className="app-button-gradient">
            Ir al login ahora
          </button>
        </div>
      </div>
    </div>
  )
}
