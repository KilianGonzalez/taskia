'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@/components/layout/sidebar-context'
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListTodo,
  Settings,
  Zap,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/calendar', label: 'Calendario', icon: Calendar },
  { href: '/dashboard/commitments', label: 'Compromisos', icon: CalendarClock },
  { href: '/dashboard/tasks', label: 'Tareas', icon: ListTodo },
  { href: '/dashboard/goals', label: 'Objetivos', icon: Zap },
  { href: '/dashboard/settings', label: 'Ajustes', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <div
      className={`relative flex h-full flex-col border-r border-sidebar-border/75 bg-sidebar/92 backdrop-blur-sm transition-all duration-300 ${
        collapsed ? 'w-[4.4rem]' : 'w-64'
      }`}
    >
      <div
        className={`flex h-16 items-center border-b border-sidebar-border/70 px-4 ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {!collapsed ? (
          <div className="section-enter">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">TaskIA</p>
            <h2 className="text-lg font-bold text-sidebar-foreground">Workspace</h2>
          </div>
        ) : (
          <span className="text-lg font-black text-sidebar-foreground">T</span>
        )}
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              style={{ animationDelay: `${index * 40}ms` }}
              className={`item-enter group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-300 ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-md'
                  : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={toggle}
        title={collapsed ? 'Expandir menu' : 'Colapsar menu'}
        className="absolute -right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-sidebar-border bg-card text-muted-foreground shadow-md transition-all duration-300 hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </div>
  )
}
