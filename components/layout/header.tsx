"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface HeaderProps {
  avatarUrl?: string | null
  userName: string
}

function getCurrentWeekRange() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const weekNumber = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7
  )

  return { range: `${fmt(monday)} - ${fmt(sunday)}`, week: weekNumber }
}

export function Header({ avatarUrl, userName }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { range, week } = getCurrentWeekRange()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleGoToProfile = () => {
    router.push("/profile")
  }

  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0]?.toUpperCase())
      .join('')
  }

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur sticky top-0 z-40 px-6">
      <div className="flex h-14 items-center justify-between">

        {/* Título + semana */}
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-[#0f172a] dark:text-white">
            Tu semana
          </h1>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            Semana {week} · {range}
          </span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2">

          {/* Notificaciones */}
          <button
            className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Notificaciones"
          >
            🔔
          </button>

          {/* Avatar */}
          <button
            onClick={handleGoToProfile}
            className="h-8 w-8 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 relative group transition-colors"
            title="Ver perfil"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Perfil"
                className="h-full w-full object-cover rounded-full"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-[#1e2d5e] to-[#2d4a8a] flex items-center justify-center rounded-full text-xs font-semibold text-white">
                {getInitials(userName)}
              </div>
            )}
            {/* Tooltip */}
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap pointer-events-none z-50">
              Ver perfil
            </div>
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="h-8 w-8 rounded-full bg-[#1e2d5e] dark:bg-gray-700 flex items-center justify-center text-white hover:bg-[#2d4a8a] dark:hover:bg-gray-600 transition-colors"
            title="Cerrar sesión"
          >
            ⏻
          </button>
        </div>
      </div>
    </header>
  )
}