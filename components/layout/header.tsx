"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface HeaderProps {
  avatarUrl?: string | null
  userName: string
}

export function Header({ avatarUrl, userName }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleGoToProfile = () => {
    router.push("/profile")
  }

  // Extraer inicial del nombre para el avatar por defecto
  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase())
      .join('')
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40 px-6">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">Tu semana</h1>
          <span className="text-sm text-muted-foreground">(18-24 Feb)</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            🔔
          </button>

          {/* Avatar con lógica mejorada */}
          <button
              onClick={handleGoToProfile}
              className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center bg-muted hover:bg-muted/90 relative group"
              title="Ver perfil"
            >
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Perfil" 
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center rounded-full text-xs font-semibold text-white">
                  U {/* Inicial fija por ahora */}
                </div>
              )}
              {/* Tooltip */}
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50">
                Ver perfil
              </div>
            </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </div>
    </header>
  )
}