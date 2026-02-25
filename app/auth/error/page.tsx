"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AuthError() {
  const router = useRouter()

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/(auth)/login")
    }, 3000)

    return () => clearTimeout(timer)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Error de autenticación</h1>
        <p className="text-muted-foreground">
          Hubo un error al procesar tu autenticación. Serás redirigido al login...
        </p>
        <button 
          onClick={() => router.push("/(auth)/login")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Ir al login ahora
        </button>
      </div>
    </div>
  )
}
