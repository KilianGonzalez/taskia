'use client'

import { Bell, LogOut, UserCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UserAvatar } from '@/components/shared/user-avatar'

interface HeaderProps {
  avatarUrl?: string | null
  userName?: string
}

function getCurrentWeekRange() {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const weekNumber = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 +
      new Date(now.getFullYear(), 0, 1).getDay() +
      1) /
      7
  )

  return { range: `${fmt(monday)} - ${fmt(sunday)}`, week: weekNumber }
}

export function Header({ avatarUrl, userName }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()
  const { range, week } = getCurrentWeekRange()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 px-4 backdrop-blur-lg sm:px-6">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between">
        <div className="item-enter">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Tu semana</h1>
          <p className="text-xs text-muted-foreground">Semana {week} · {range}</p>
        </div>

        <div className="flex items-center gap-2 item-enter">
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-card/85 text-muted-foreground transition-all duration-300 hover:-translate-y-0.5 hover:text-foreground"
            title="Notificaciones"
          >
            <Bell className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="group flex items-center gap-2 rounded-xl border border-border/70 bg-card/85 px-2 py-1.5 transition-all duration-300 hover:-translate-y-0.5"
            title="Perfil"
          >
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-full border border-border/60 bg-muted">
              <UserAvatar avatarUrl={avatarUrl} name={userName} />
            </span>
            <span className="hidden items-center gap-1 text-sm font-medium text-foreground md:inline-flex">
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              {userName ?? 'Perfil'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-primary text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
            title="Cerrar sesion"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
