"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface HeaderProps {
  avatarUrl?: string | null
}

export function Header({ avatarUrl }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleGoToProfile = () => {
    router.push("/profile")
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

          {/* Avatar con imagen por defecto */}
          <button
            onClick={handleGoToProfile}
            className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center bg-muted hover:bg-muted/90"
            title="Ver perfil"
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt="Perfil" 
                className="h-full w-full object-cover"
              />
            ) : (
              <img 
                src="/images/default-avatar.png" 
                alt="Avatar por defecto" 
                className="h-full w-full object-cover"
              />
            )}
          </button>

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </div>
    </header>
  )
}
