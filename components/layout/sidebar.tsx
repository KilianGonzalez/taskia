"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSidebar } from "@/components/layout/sidebar-context"
import { 
  CalendarClock,
  LayoutDashboard, 
  ListTodo, 
  Zap, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react"

const navItems = [
  { href: "/dashboard",          label: "Inicio",     icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendario", icon: Calendar },
  { href: "/dashboard/commitments", label: "Compromisos", icon: CalendarClock },
  { href: "/dashboard/tasks",    label: "Tareas",     icon: ListTodo },
  { href: "/dashboard/goals",    label: "Objetivos",  icon: Zap },
  { href: "/dashboard/settings", label: "Ajustes",    icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <div className={`relative h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>

      {/* Logo */}
      <div className={`flex items-center border-b border-gray-200 dark:border-gray-800 h-14 px-4 ${
        collapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!collapsed ? (
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskIA
            </h2>
          </div>
        ) : (
          <span className="text-lg font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            T
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? "bg-[#1e2d5e] text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className={`shrink-0 w-5 h-5 transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-white'
              }`} />
              {!collapsed && (
                <span className={`text-sm font-medium ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                }`}>
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Botón flotante */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        className="absolute -right-4 top-1/2 -translate-y-1/2 z-20
          flex items-center justify-center
          w-8 h-8 rounded-full
          bg-white dark:bg-gray-900
          border-2 border-slate-200 dark:border-gray-700
          shadow-md hover:shadow-lg
          text-slate-400 dark:text-slate-500
          hover:text-[#1e2d5e] dark:hover:text-white
          hover:border-[#1e2d5e] dark:hover:border-gray-500
          transition-all duration-200"
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4" />
          : <ChevronLeft className="w-4 h-4" />
        }
      </button>

    </div>
  )
}
